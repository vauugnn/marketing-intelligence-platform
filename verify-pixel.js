const http = require('http');

const data = JSON.stringify({

    pixel_id: 'pix_1234567890abcdef1234567890abcdef',
    session_id: '12345678-1234-1234-1234-123456789012',
    event_type: 'purchase', // Changed to purchase to test value/currency
    page_url: 'http://example.com/checkout/success',
    timestamp: new Date().toISOString(),
    // Visitor Data
    visitor_id: 'user_123',
    visitor_email: 'john.doe@example.com',
    visitor_name: 'John Doe',
    // Conversion Data
    value: 99.99,
    currency: 'USD',
    metadata: {
        element_id: 'checkout-btn',
        cookies: { test: 'value' }
    }
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/pixel/track',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Sending request to pixel backend...');

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);

    let responseData = '';

    res.on('data', (d) => {
        responseData += d;
    });

    res.on('end', () => {
        console.log('Response Body Raw:', responseData);
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('SUCCESS: Backend accepted click event.');
        } else {
            console.error('FAILURE: Backend rejected click event.');
            try {
                const parsed = JSON.parse(responseData);
                console.error('Error details:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.error('Could not parse error response body as JSON');
            }
            // Do not exit process immediately to allow logs to flush
        }
    });
});

req.on('error', (error) => {
    console.error('Error sending request:', error);
    process.exit(1);
});

req.write(data);
req.end();
