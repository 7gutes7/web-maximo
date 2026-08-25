<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// 1. Endpoint para desenredar enlaces cortos de Google Maps en el servidor
if (isset($_GET["action"]) && $_GET["action"] === "unshorten" && !empty($_GET["url"])) {
    $url = $_GET["url"];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    curl_exec($ch);
    $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);

    if ($finalUrl) {
        echo json_encode(["success" => true, "resolvedUrl" => $finalUrl]);
    } else {
        echo json_encode(["success" => false, "error" => "No se pudo resolver la URL"]);
    }
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Método no permitido. Use POST."]);
    exit;
}

$input = file_get_contents("php://input");
if (empty($input)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Datos vacíos."]);
    exit;
}

$data = json_decode($input, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "El JSON debe ser un arreglo de inmuebles válido."]);
    exit;
}

$filePath = __DIR__ . "/data/catalogo.json";

if (!is_dir(__DIR__ . "/data")) {
    mkdir(__DIR__ . "/data", 0755, true);
}

$bytes = file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

if ($bytes === false) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Error de permisos al escribir en data/catalogo.json."]);
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Catálogo guardado exitosamente en el servidor de tu dominio.",
    "count" => count($data),
    "timestamp" => date("Y-m-d H:i:s")
]);
