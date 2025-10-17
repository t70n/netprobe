import json
import asyncio
import websockets

# just to test the connection / see the payload

async def telemetry_client():
    uri = "ws://localhost:8765"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"connect to {uri}\n")

            while True:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    #debug purposes
                    print(json.dumps(data, indent=4)) 
                    print("-" * 50) 
                except websockets.ConnectionClosed:
                    print("connection closed")
                    break
    except ConnectionRefusedError:
        print("could not connect to server")

if __name__ == "__main__":
    asyncio.run(telemetry_client())
