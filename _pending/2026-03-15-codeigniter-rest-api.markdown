---
title: "CodeIgniter 3 REST API 설계 패턴"
date: "2026-03-15T14:45:00.000Z"
template: "post"
draft: false
slug: "/posts/codeigniter-rest-api"
category: "PHP"
tags:
  - "CodeIgniter"
  - "REST API"
  - "PHP"
description: "CollabPlatform 백엔드에서 구현한 CodeIgniter 3 기반의 REST API 설계 패턴과 JWT 인증, 응답 포맷팅, API 버전 관리 방법을 소개합니다."
---

## 소개

CollabPlatform 프로젝트에서는 CodeIgniter 3를 기반으로 견고한 REST API를 구축했습니다. 이 글에서는 우리가 사용하는 컨트롤러 구조, JWT 인증, 응답 표준화, 그리고 버전 관리 전략을 공유합니다.

## REST 컨트롤러 기본 구조

### 1. 베이스 REST 컨트롤러 구현

`application/controllers/api/rest/Base.php`:

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Base extends CI_Controller {

    protected $api_version = 'v1';
    protected $response_data = [];
    protected $response_code = 200;

    public function __construct() {
        parent::__construct();
        $this->load->library('api_response');
        $this->load->library('jwt_handler');
        $this->load->database();

        // 요청 Content-Type 확인
        $this->check_content_type();
    }

    protected function check_content_type() {
        if ($this->input->method() !== 'get') {
            $content_type = $this->input->server('CONTENT_TYPE');
            if (strpos($content_type, 'application/json') === false) {
                $this->send_error('Invalid Content-Type. Use application/json', 400);
            }
        }
    }

    /**
     * 성공 응답 전송
     */
    protected function send_success($data = [], $message = 'Success', $code = 200) {
        $this->response_code = $code;
        $this->response_data = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        $this->output_response();
    }

    /**
     * 에러 응답 전송
     */
    protected function send_error($message = 'Error', $code = 400, $data = null) {
        $this->response_code = $code;
        $this->response_data = [
            'success' => false,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        $this->output_response();
    }

    /**
     * 응답 전송
     */
    protected function output_response() {
        http_response_code($this->response_code);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        echo json_encode($this->response_data);
        exit;
    }
}
```

### 2. 인증 미들웨어 (JWT)

`application/libraries/Jwt_handler.php`:

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Jwt_handler {
    private $secret_key = 'your-secret-key-change-this';
    private $algorithm = 'HS256';

    /**
     * JWT 토큰 생성
     */
    public function generate_token($user_id, $email, $expire_time = 3600) {
        $time = time();
        $payload = [
            'iat' => $time,
            'exp' => $time + $expire_time,
            'user_id' => $user_id,
            'email' => $email
        ];

        return $this->encode($payload);
    }

    /**
     * JWT 토큰 검증
     */
    public function verify_token($token) {
        try {
            $decoded = $this->decode($token);
            if (!isset($decoded->exp) || $decoded->exp < time()) {
                return false;
            }
            return $decoded;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * 토큰 인코딩
     */
    private function encode($payload) {
        $header = [
            'alg' => $this->algorithm,
            'typ' => 'JWT'
        ];

        $header_encoded = $this->base64url_encode(json_encode($header));
        $payload_encoded = $this->base64url_encode(json_encode($payload));

        $signature = hash_hmac(
            'sha256',
            $header_encoded . '.' . $payload_encoded,
            $this->secret_key,
            true
        );
        $signature_encoded = $this->base64url_encode($signature);

        return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
    }

    /**
     * 토큰 디코딩
     */
    private function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }

        list($header_encoded, $payload_encoded, $signature_encoded) = $parts;

        // 서명 검증
        $signature = hash_hmac(
            'sha256',
            $header_encoded . '.' . $payload_encoded,
            $this->secret_key,
            true
        );
        $signature_expected = $this->base64url_encode($signature);

        if ($signature_encoded !== $signature_expected) {
            throw new Exception('Invalid token signature');
        }

        $payload = json_decode(base64_decode(strtr($payload_encoded, '-_', '+/')));
        return $payload;
    }

    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
```

## API 엔드포인트 구현

### 1. 사용자 리소스 컨트롤러

`application/controllers/api/v1/Users.php`:

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require_once APPPATH . '/controllers/api/rest/Base.php';

class Users extends Base {

    public function __construct() {
        parent::__construct();
        $this->load->model('user_model');
    }

    /**
     * GET /api/v1/users
     * 사용자 목록 조회
     */
    public function index() {
        if ($this->input->method() !== 'get') {
            $this->send_error('Method not allowed', 405);
        }

        // 토큰 검증
        if (!$this->verify_token_middleware()) {
            return;
        }

        $page = $this->input->get('page') ?? 1;
        $limit = $this->input->get('limit') ?? 20;
        $offset = ($page - 1) * $limit;

        $users = $this->user_model->get_users($limit, $offset);
        $total = $this->user_model->count_users();

        $this->send_success([
            'users' => $users,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * GET /api/v1/users/:id
     * 특정 사용자 조회
     */
    public function get_user($user_id) {
        if (!$this->verify_token_middleware()) {
            return;
        }

        $user = $this->user_model->get_user_by_id($user_id);

        if (!$user) {
            $this->send_error('User not found', 404);
        }

        $this->send_success($user);
    }

    /**
     * POST /api/v1/users
     * 사용자 생성
     */
    public function create() {
        if ($this->input->method() !== 'post') {
            $this->send_error('Method not allowed', 405);
        }

        if (!$this->verify_token_middleware()) {
            return;
        }

        $input = json_decode($this->input->raw_input_stream);

        // 유효성 검사
        if (!isset($input->email) || !isset($input->name)) {
            $this->send_error('Missing required fields', 400);
        }

        if (!filter_var($input->email, FILTER_VALIDATE_EMAIL)) {
            $this->send_error('Invalid email format', 400);
        }

        // 중복 확인
        if ($this->user_model->email_exists($input->email)) {
            $this->send_error('Email already exists', 409);
        }

        // 사용자 생성
        $user_data = [
            'email' => $input->email,
            'name' => $input->name,
            'password' => password_hash($input->password, PASSWORD_BCRYPT),
            'created_at' => date('Y-m-d H:i:s')
        ];

        $user_id = $this->user_model->insert($user_data);

        if (!$user_id) {
            $this->send_error('Failed to create user', 500);
        }

        $user = $this->user_model->get_user_by_id($user_id);
        $this->send_success($user, 'User created successfully', 201);
    }

    /**
     * PUT /api/v1/users/:id
     * 사용자 정보 업데이트
     */
    public function update($user_id) {
        if ($this->input->method() !== 'put') {
            $this->send_error('Method not allowed', 405);
        }

        if (!$this->verify_token_middleware()) {
            return;
        }

        $input = json_decode($this->input->raw_input_stream);

        // 현재 사용자인지 확인
        if ($this->current_user->user_id != $user_id) {
            $this->send_error('Unauthorized', 403);
        }

        $user = $this->user_model->get_user_by_id($user_id);
        if (!$user) {
            $this->send_error('User not found', 404);
        }

        // 업데이트 데이터 준비
        $update_data = [];
        if (isset($input->name)) $update_data['name'] = $input->name;
        if (isset($input->email)) $update_data['email'] = $input->email;
        $update_data['updated_at'] = date('Y-m-d H:i:s');

        if (!$this->user_model->update($user_id, $update_data)) {
            $this->send_error('Failed to update user', 500);
        }

        $updated_user = $this->user_model->get_user_by_id($user_id);
        $this->send_success($updated_user, 'User updated successfully');
    }

    /**
     * DELETE /api/v1/users/:id
     * 사용자 삭제
     */
    public function delete($user_id) {
        if ($this->input->method() !== 'delete') {
            $this->send_error('Method not allowed', 405);
        }

        if (!$this->verify_token_middleware()) {
            return;
        }

        // 관리자 권한 확인
        if ($this->current_user->role !== 'admin') {
            $this->send_error('Forbidden', 403);
        }

        if (!$this->user_model->delete($user_id)) {
            $this->send_error('Failed to delete user', 500);
        }

        $this->send_success(null, 'User deleted successfully');
    }

    /**
     * JWT 토큰 검증
     */
    private function verify_token_middleware() {
        $headers = $this->input->request_headers();
        $auth_header = $headers['Authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            $this->send_error('Missing or invalid authorization header', 401);
            return false;
        }

        $token = $matches[1];
        $decoded = $this->jwt_handler->verify_token($token);

        if (!$decoded) {
            $this->send_error('Invalid token', 401);
            return false;
        }

        $this->current_user = $decoded;
        return true;
    }
}
```

## API 버전 관리

`routes.php`:

```php
// v1 API 라우트
$route['api/v1/users']['get'] = 'api/v1/users/index';
$route['api/v1/users']['post'] = 'api/v1/users/create';
$route['api/v1/users/(:num)']['get'] = 'api/v1/users/get_user/$1';
$route['api/v1/users/(:num)']['put'] = 'api/v1/users/update/$1';
$route['api/v1/users/(:num)']['delete'] = 'api/v1/users/delete/$1';

// v2 API 라우트 (향후 확장)
$route['api/v2/users']['get'] = 'api/v2/users/index';
```

## 요청/응답 예제

### 로그인 요청

```bash
curl -X POST http://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 응답

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "name": "John Doe"
    }
  },
  "timestamp": "2026-03-15 14:45:30"
}
```

### 사용자 목록 요청

```bash
curl -X GET "http://api.example.com/api/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 에러 처리

```php
// 일관된 에러 응답 형식
[
  "success": false,
  "message": "Validation error",
  "data": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-03-15 14:45:30"
]
```

## 성능 최적화

### 1. 데이터베이스 쿼리 최적화

```php
// N+1 쿼리 문제 해결
public function get_users_with_roles($limit, $offset) {
    $this->db->select('users.*, roles.role_name');
    $this->db->join('roles', 'users.role_id = roles.id');
    $this->db->limit($limit, $offset);
    return $this->db->get('users')->result_array();
}
```

### 2. 응답 캐싱

```php
public function get_public_data() {
    $cache_key = 'public_data_v1';
    $data = $this->cache->get($cache_key);

    if (!$data) {
        $data = $this->model->get_public_data();
        $this->cache->save($cache_key, $data, 3600); // 1시간 캐싱
    }

    $this->send_success($data);
}
```

## 결론

CodeIgniter 3으로 REST API를 구축할 때:

1. **일관된 응답 형식**: 모든 엔드포인트에서 동일한 응답 구조
2. **JWT 인증**: 안전한 토큰 기반 인증
3. **명확한 라우팅**: API 버전별 라우트 분리
4. **적절한 HTTP 상태 코드**: 요청 결과를 정확히 전달
5. **입력 검증**: 서버에서의 철저한 유효성 검사

이러한 패턴을 따르면 확장 가능하고 유지보수하기 쉬운 API를 구축할 수 있습니다.
