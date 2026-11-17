import http.server
import socketserver
import os
import json
import sys

PORT = 5050
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(BASE_DIR, 'web')
RANKINGS_FILE = os.path.join(DIRECTORY, 'public', 'ranking_data.json')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/rankings'):
            self.handle_get_rankings()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/rankings'):
            self.handle_post_ranking()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_get_rankings(self):
        try:
            if os.path.exists(RANKINGS_FILE):
                with open(RANKINGS_FILE, 'r', encoding='utf-8') as f:
                    data = f.read()
            else:
                data = "[]"
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f"Error reading rankings: {str(e)}")

    def handle_post_ranking(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            new_entry = json.loads(post_data.decode('utf-8'))
            
            rankings = []
            if os.path.exists(RANKINGS_FILE):
                with open(RANKINGS_FILE, 'r', encoding='utf-8') as f:
                    try:
                        rankings = json.load(f)
                    except json.JSONDecodeError:
                        rankings = []
            
            # Prepend or insert new entry
            rankings.insert(0, new_entry)
            
            os.makedirs(os.path.dirname(RANKINGS_FILE), exist_ok=True)
            with open(RANKINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(rankings, f, ensure_ascii=False, indent=2)
                
            response_data = json.dumps({"status": "success", "data": new_entry})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(response_data.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f"Error saving ranking: {str(e)}")

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"=================================================")
        print(f"DBI202 EXAM MASTER SERVER")
        print(f"Server running at: http://localhost:{PORT}")
        print(f"Root directory: {DIRECTORY}")
        print(f"Leaderboard API: http://localhost:{PORT}/api/rankings")
        print(f"=================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")

if __name__ == '__main__':
    main()
