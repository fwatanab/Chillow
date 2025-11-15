package storage

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"chillow/config"
)

// Manager abstracts attachment persistence.
type Manager interface {
	SaveChatMedia(userID uint, file *multipart.FileHeader) (publicURL string, objectKey string, err error)
	Delete(objectKey string) error
}

var defaultManager Manager

func Init(cfg *config.Config) error {
	switch strings.ToLower(cfg.AttachmentStorage) {
	case "", "local":
		defaultManager = &localManager{baseDir: cfg.UploadDir, backendURL: cfg.BackendURL}
	case "s3":
		mgr, err := newS3Manager(cfg)
		if err != nil {
			return err
		}
		defaultManager = mgr
	default:
		return fmt.Errorf("unsupported attachment storage: %s", cfg.AttachmentStorage)
	}
	return nil
}

func Default() Manager { return defaultManager }

// ---- Local implementation ----

type localManager struct {
	baseDir    string
	backendURL string
}

func (m *localManager) SaveChatMedia(userID uint, file *multipart.FileHeader) (string, string, error) {
	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().UnixNano(), filepath.Ext(file.Filename))
	dir := filepath.Join(m.baseDir, "chat", fmt.Sprintf("%d", userID))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", "", err
	}
	path := filepath.Join(dir, filename)
	if err := saveUploadedFile(file, path); err != nil {
		return "", "", err
	}
	rel := strings.TrimPrefix(path, filepath.Clean(m.baseDir)+string(os.PathSeparator))
	public := strings.TrimRight(m.backendURL, "/") + "/uploads/" + filepath.ToSlash(rel)
	return public, filepath.ToSlash(rel), nil
}

func (m *localManager) Delete(objectKey string) error {
	if objectKey == "" {
		return nil
	}
	filePath := filepath.Join(m.baseDir, objectKey)
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}

// ---- Minimal S3 (SigV4) ----

type s3Manager struct {
	client     *http.Client
	endpoint   *url.URL
	bucket     string
	region     string
	accessKey  string
	secretKey  string
	usePathURL bool
}

func newS3Manager(cfg *config.Config) (Manager, error) {
	if cfg.S3Bucket == "" || cfg.S3AccessKey == "" || cfg.S3SecretKey == "" {
		return nil, fmt.Errorf("S3 credentials are required")
	}
	endpoint := cfg.S3Endpoint
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://s3.%s.amazonaws.com", cfg.S3Region)
	}
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}
	if parsed.Scheme == "" {
		parsed.Scheme = "https"
	}
	return &s3Manager{
		client:     &http.Client{Timeout: 30 * time.Second},
		endpoint:   parsed,
		bucket:     cfg.S3Bucket,
		region:     cfg.S3Region,
		accessKey:  cfg.S3AccessKey,
		secretKey:  cfg.S3SecretKey,
		usePathURL: cfg.S3UsePathStyle,
	}, nil
}

func (s *s3Manager) SaveChatMedia(userID uint, file *multipart.FileHeader) (string, string, error) {
	key := fmt.Sprintf("chat/%d/%d%s", userID, time.Now().UnixNano(), filepath.Ext(file.Filename))
	src, err := file.Open()
	if err != nil {
		return "", "", err
	}
	defer src.Close()
	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, src); err != nil {
		return "", "", err
	}
	if err := s.putObject(key, buf.Bytes(), file.Header.Get("Content-Type")); err != nil {
		return "", "", err
	}
	return s.objectURL(key), key, nil
}

func (s *s3Manager) Delete(objectKey string) error {
	if objectKey == "" {
		return nil
	}
	req, err := s.newRequest(http.MethodDelete, objectKey, nil)
	if err != nil {
		return err
	}
	if err := s.signRequest(req, hashSHA256(nil)); err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("s3 delete failed: %s %s", resp.Status, string(body))
	}
	return nil
}

func (s *s3Manager) putObject(key string, body []byte, contentType string) error {
	req, err := s.newRequest(http.MethodPut, key, bytes.NewReader(body))
	if err != nil {
		return err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	hash := hashSHA256(body)
	req.Header.Set("x-amz-content-sha256", hash)
	if err := s.signRequest(req, hash); err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("s3 upload failed: %s %s", resp.Status, string(b))
	}
	return nil
}

func (s *s3Manager) objectURL(key string) string {
	u := *s.endpoint
	if s.usePathURL {
		u.Path = strings.TrimSuffix(u.Path, "/") + "/" + path.Join(s.bucket, key)
	} else {
		u.Host = s.bucket + "." + u.Host
		u.Path = strings.TrimSuffix(u.Path, "/") + "/" + key
	}
	return u.String()
}

func (s *s3Manager) newRequest(method, key string, body io.Reader) (*http.Request, error) {
	u := *s.endpoint
	if s.usePathURL {
		u.Path = strings.TrimSuffix(u.Path, "/") + "/" + path.Join(s.bucket, key)
	} else {
		u.Host = s.bucket + "." + u.Host
		u.Path = strings.TrimSuffix(u.Path, "/") + "/" + key
	}
	req, err := http.NewRequest(method, u.String(), body)
	if err != nil {
		return nil, err
	}
	if body == nil {
		req.Header.Set("x-amz-content-sha256", hashSHA256(nil))
	}
	return req, nil
}

func (s *s3Manager) signRequest(req *http.Request, payloadHash string) error {
	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	req.Header.Set("x-amz-date", amzDate)
	if req.Header.Get("x-amz-content-sha256") == "" {
		req.Header.Set("x-amz-content-sha256", payloadHash)
	}

	canonHeaders, signedHeaders := canonicalHeaders(req)
	canonRequest := strings.Join([]string{
		req.Method,
		canonicalURI(req.URL.Path),
		canonicalQuery(req.URL.RawQuery),
		canonHeaders + "\n",
		signedHeaders,
		req.Header.Get("x-amz-content-sha256"),
	}, "\n")
	scope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, s.region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		hashSHA256([]byte(canonRequest)),
	}, "\n")
	key := deriveSigningKey(s.secretKey, dateStamp, s.region, "s3")
	signature := hex.EncodeToString(hmacSHA256(key, stringToSign))
	auth := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s", s.accessKey, scope, signedHeaders, signature)
	req.Header.Set("Authorization", auth)
	return nil
}

// helper functions for SigV4

func canonicalURI(p string) string {
	if p == "" {
		return "/"
	}
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return path.Clean(p)
}

func canonicalQuery(raw string) string {
	if raw == "" {
		return ""
	}
	values, _ := url.ParseQuery(raw)
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var parts []string
	for _, k := range keys {
		vs := values[k]
		sort.Strings(vs)
		for _, v := range vs {
			parts = append(parts, url.QueryEscape(k)+"="+url.QueryEscape(v))
		}
	}
	return strings.Join(parts, "&")
}

func canonicalHeaders(req *http.Request) (string, string) {
	type pair struct{ key, value string }
	headers := []pair{{"host", strings.ToLower(req.Host)}}
	for k, v := range req.Header {
		headers = append(headers, pair{strings.ToLower(k), strings.TrimSpace(strings.Join(v, ","))})
	}
	sort.Slice(headers, func(i, j int) bool { return headers[i].key < headers[j].key })
	seen := make(map[string]struct{})
	var canonical []string
	var signed []string
	for _, h := range headers {
		if _, ok := seen[h.key]; ok {
			continue
		}
		seen[h.key] = struct{}{}
		canonical = append(canonical, fmt.Sprintf("%s:%s", h.key, h.value))
		signed = append(signed, h.key)
	}
	return strings.Join(canonical, "\n"), strings.Join(signed, ";")
}

func hashSHA256(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func deriveSigningKey(secret, date, region, service string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secret), date)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, service)
	return hmacSHA256(kService, "aws4_request")
}

func hmacSHA256(key []byte, data string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(data))
	return mac.Sum(nil)
}
