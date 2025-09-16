#!/bin/bash
echo "Testing API endpoints..."
echo "Health endpoint:"
curl -s http://localhost:3000/api/health
echo ""
echo "Hello endpoint:"
curl -s http://localhost:3000/api/hello
echo ""
echo "Root endpoint:"
curl -s http://localhost:3000/
echo ""