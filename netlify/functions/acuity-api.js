const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    // --- Security: Get API credentials from Netlify environment variables ---
    const { ACUITY_USER_ID, ACUITY_API_KEY } = process.env;
    const { action, code, appointmentTypeID, datetime, firstName, lastName, email, phone } = event.queryStringParameters;
    
    // --- Create the Authorization Header ---
    const auth = 'Basic ' + Buffer.from(ACUITY_USER_ID + ':' + ACUITY_API_KEY).toString('base64');

    // --- API Endpoint Router ---
    try {
        if (action === 'checkCode') {
            if (!code) throw new Error('No code provided.');
            const response = await fetch(`https://acuityscheduling.com/api/v1/certificates/${code}`, {
                headers: { 'Authorization': auth }
            });
            if (!response.ok) throw new Error('Certificate not found or invalid.');
            const data = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify({ appointmentTypeID: data.appointmentTypeID })
            };
        } 
        
        else if (action === 'getDates') {
            if (!appointmentTypeID) throw new Error('No appointmentTypeID provided.');
            const response = await fetch(`https://acuityscheduling.com/api/v1/availability/dates?appointmentTypeID=${appointmentTypeID}`, {
                headers: { 'Authorization': auth }
            });
            if (!response.ok) throw new Error('Could not fetch available dates.');
            const data = await response.json();
             return {
                statusCode: 200,
                body: JSON.stringify(data)
            };
        } 
        
        else if (action === 'bookAppointment') {
            const bookingData = JSON.parse(event.body);
            const response = await fetch('https://acuityscheduling.com/api/v1/appointments', {
                method: 'POST',
                headers: {
                    'Authorization': auth,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    appointmentTypeID: bookingData.appointmentTypeID,
                    datetime: bookingData.datetime,
                    firstName: bookingData.firstName,
                    lastName: bookingData.lastName,
                    email: bookingData.email,
                    phone: bookingData.phone,
                    certificate: bookingData.certificate,
                }),
            });
             if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Acuity API Error: ${errorBody}`);
            }
            const data = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify(data)
            };
        }

        else {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action specified.' }) };
        }

    } catch (error) {
        console.error('Acuity API Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

