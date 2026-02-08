
import axios from 'axios';

async function verify() {
    // Mock valid pixel ID (32 hex chars) and UUID
    const pixelId = 'pix_' + 'a'.repeat(32);
    const sessionId = '00000000-0000-0000-0000-000000000000';
    const timestamp = new Date().toISOString();

    const payload = {
        pixel_id: pixelId,
        session_id: sessionId,
        event_type: 'custom', // or 'conversion'
        page_url: 'http://test.com',
        timestamp: timestamp,
        metadata: {
            visitor_id: 'test_visitor_123',
            email: 'test@example.com',
            name: 'Test User',
            value: 100.50,
            currency: 'USD'
        }
    };

    try {
        console.log('Sending pixel event payload:', JSON.stringify(payload, null, 2));
        const response = await axios.post('http://localhost:3001/api/pixel/track', payload);
        console.log('Response:', response.data);

        if (response.data.success) {
            console.log('✅ Pixel event tracked successfully.');
            console.log('ℹ️  Please verify in your database that the following columns in `pixel_events` are populated for this event:');
            console.log('   - visitor_id: test_visitor_123');
            console.log('   - visitor_email: test@example.com');
            console.log('   - visitor_name: Test User');
            console.log('   - value: 100.5');
            console.log('   - currency: USD');
        } else {
            console.error('❌ Failed:', response.data);
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

verify();
