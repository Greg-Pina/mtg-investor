# MTG Investor - TypeScript Express App with Python Integration

A robust TypeScript Express application with MongoDB integration and Python module support for advanced Magic: The Gathering card data processing and investment analysis.

## Features

- **TypeScript Express Server**: Modern Express.js application with TypeScript
- **MongoDB Integration**: Full CRUD operations with Mongoose ODM
- **Python Module Integration**: Execute Python scripts from Node.js with data exchange
- **MTG Card Data Processing**: Integration with EDHREC.com via pyedhrec library
- **Investment Analysis**: Automated analysis of MTG card investment potential
- **JSON Validation**: Robust JSON parsing and validation middleware
- **Error Handling**: Comprehensive error handling and logging
- **Environment Configuration**: Configurable via environment variables

## Project Structure

```
src/
├── adapters/          # External service adapters (database, etc.)
├── controllers/       # Request handlers and business logic
├── middleware/        # Express middleware functions
├── models/           # Database models and schemas
├── routes/           # Express route definitions
├── services/         # Business logic services
└── app.ts            # Express app configuration

python/               # Python scripts for processing
├── advanced_processor.py  # MTG card data processor
└── requirements.txt       # Python dependencies
configs/              # Configuration files
```

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Ensure Python 3 is installed and available:
```bash
python3 --version
```

3. Install Python dependencies:
```bash
# Install pip if needed (Ubuntu/Debian)
sudo apt install python3-pip

# Install MTG card data library
pip3 install pyedhrec
```

4. Configure environment variables in `configs/.env`:
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mtg-investor
PYTHON_PATH=python3
PYTHON_SCRIPT_TIMEOUT=30000
NODE_ENV=development
```

5. Start MongoDB (if running locally):
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or using installed MongoDB
mongod
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## API Endpoints

### MTG Card Data Processing
- `POST /api/mtg/process` - Process MTG card data from EDHREC
- `GET /api/mtg/card/:name` - Get specific card data by name
- `GET /api/mtg/search` - Search cards with filters (query, isCommander, hasCombos)
- `GET /api/mtg/investment` - Get cards with investment potential
- `DELETE /api/mtg/card/:name` - Delete card data

### General Data Processing
- `POST /api/data/process` - Process JSON data with optional Python processing
- `GET /api/data/processed` - Get all processed data (with pagination)
- `GET /api/data/processed/:id` - Get specific processed data by ID
- `DELETE /api/data/processed/:id` - Delete processed data by ID

### Health & Status
- `GET /api/health` - Health check endpoint
- `GET /api/hello` - Simple hello world endpoint

## API Usage Examples

### Process Data with Python Script

```bash
curl -X POST http://localhost:3000/api/data/process \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "numbers": [1, 2, 3, 4, 5],
      "text": "Hello world, this is a test message",
      "value": 42
    },
    "pythonScript": "example_processor.py",
    "options": {
      "timeout": 10000,
      "source": "api_test"
    }
  }'
```

### Process Data Without Python

```bash
curl -X POST http://localhost:3000/api/data/process \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "user": "john_doe",
      "action": "login",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  }'
```

### Get Processed Data

```bash
# Get all processed data
curl http://localhost:3000/api/data/processed

# Get with pagination and filtering
curl "http://localhost:3000/api/data/processed?page=1&limit=5&status=success"

# Get specific item
curl http://localhost:3000/api/data/processed/{id}
```

## Python Integration

### Available Python Scripts

1. **example_processor.py** - Basic data processing with statistics
2. **advanced_processor.py** - Advanced analysis with text processing and time series

### Creating Custom Python Scripts

Python scripts should:
1. Accept JSON data as a command line argument
2. Return results as JSON to stdout
3. Handle errors gracefully

Example Python script structure:

```python
#!/usr/bin/env python3
import sys
import json

def process_data(data):
    # Your processing logic here
    result = {
        'processed': True,
        'input': data,
        'output': 'your_processed_data'
    }
    return result

def main():
    try:
        json_input = sys.argv[1]
        data = json.loads(json_input)
        result = process_data(data)
        print(json.dumps(result))
    except Exception as e:
        error_result = {'error': str(e)}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
```

## Database Schema

### ProcessedData Model

```typescript
{
  originalData: Record<string, any>,     // Input data
  processedData: Record<string, any>,    // Processed result
  pythonOutput?: any,                    // Python script output
  processedAt: Date,                     // Processing timestamp
  status: 'success' | 'error' | 'processing',
  errorMessage?: string,                 // Error details if failed
  metadata?: {
    source?: string,                     // Data source identifier
    processingTime?: number,             // Processing duration (ms)
    pythonScript?: string                // Script name used
  }
}
```

## Error Handling

The application includes comprehensive error handling:

- **JSON Validation**: Invalid JSON structure returns 400 with details
- **Python Execution**: Script errors are captured and stored
- **Database Errors**: Connection and operation errors are handled
- **Timeout Handling**: Python scripts timeout after configured duration
- **Request Size Limits**: Large payloads are rejected (2MB default)

## Development

### Adding New Routes
1. Create controller in `src/controllers/`
2. Add route definition in `src/routes/`
3. Update main routes index

### Adding New Python Scripts
1. Create script in `python/` directory
2. Make executable: `chmod +x python/your_script.py`
3. Follow the JSON input/output pattern

### Testing
```bash
# Run linting
npm run lint

# Format code
npm run format

# Run tests (when available)
npm test
```

## Configuration

Environment variables:

- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `PYTHON_PATH` - Python executable path (default: python3)
- `PYTHON_SCRIPT_TIMEOUT` - Script timeout in ms (default: 30000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (info, debug, warn, error)

## Dependencies

### Main Dependencies
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **python-shell** - Python integration
- **ajv** - JSON schema validation
- **dotenv** - Environment configuration

### Development Dependencies
- **typescript** - TypeScript compiler
- **ts-node-dev** - Development server
- **eslint** - Code linting
- **prettier** - Code formatting

## License

ISC License

---

## New: Scryfall Integration and UI

### Endpoints
- `GET /api/scryfall/search?q=...&page=1` – Live query Scryfall API
- `POST /api/scryfall/save` – Body `{ q: string, pages?: number }` saves results to MongoDB (if connected)
- `GET /api/scryfall/cards?q=&setCode=&rarity=&page=&limit=` – Query saved Scryfall cards from MongoDB

### UI
Open http://localhost:3000/ to try a minimal UI:
- Run a live search and preview results
- Save results to your DB
- Query saved cards and view a D3 histogram of USD prices

Notes:
- The `scryfall_cards` schema keeps a `raw` copy of the card object for flexibility while denormalizing common fields.
- If MongoDB is not connected, the save endpoint will no-op and return mapped cards, so the UI remains usable.