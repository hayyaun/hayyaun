function Invoke-PrismBlender {
    param([string]$Command, [hashtable]$Params = @{})
    $ErrorActionPreference = 'Stop'
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $client.Connect('127.0.0.1',9876)
        $stream=$client.GetStream()
        $stream.ReadTimeout=30000
        $payload=@{type=$Command;params=$Params} | ConvertTo-Json -Depth 50 -Compress
        $bytes=[Text.Encoding]::UTF8.GetBytes($payload)
        $stream.Write($bytes,0,$bytes.Length)
        $buffer=New-Object byte[] 65536
        $message=[System.IO.MemoryStream]::new()
        while ($true) {
            $read=$stream.Read($buffer,0,$buffer.Length)
            if ($read -eq 0) {throw 'Blender closed connection'}
            $message.Write($buffer,0,$read)
            $raw=[Text.Encoding]::UTF8.GetString($message.ToArray())
            try {$response=$raw | ConvertFrom-Json -ErrorAction Stop} catch {continue}
            if ($response.status -ne 'success') {throw ($response | ConvertTo-Json -Depth 30)}
            return $response.result
        }
    } finally {$client.Dispose()}
}

