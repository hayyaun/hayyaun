import json, socket, sys

request = {'type': sys.argv[1], 'params': {}}
if len(sys.argv) > 2:
    request['params']['code'] = open(sys.argv[2], encoding='utf-8-sig').read()
with socket.create_connection(('127.0.0.1', 9876), timeout=120) as connection:
    connection.sendall(json.dumps(request).encode())
    response = b''
    while True:
        chunk = connection.recv(65536)
        if not chunk:
            break
        response += chunk
        try:
            result = json.loads(response)
            print(json.dumps(result))
            break
        except json.JSONDecodeError:
            pass
