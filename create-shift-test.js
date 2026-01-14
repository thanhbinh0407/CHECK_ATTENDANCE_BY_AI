import http from 'http';

const createShift = () => {
  const postData = JSON.stringify({
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 10,
    overtimeThresholdMinutes: 30,
    note: 'Company standard working hours'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/shifts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('✅ CREATE SHIFT Response:');
      console.log(JSON.parse(data));
      
      // Then verify with GET
      setTimeout(() => {
        const getOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/shifts',
          method: 'GET'
        };
        const getReq = http.request(getOptions, (res2) => {
          let data2 = '';
          res2.on('data', (chunk) => { data2 += chunk; });
          res2.on('end', () => {
            console.log('\n✅ GET SHIFTS Response:');
            console.log(JSON.parse(data2));
            process.exit(0);
          });
        });
        getReq.end();
      }, 500);
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });

  req.write(postData);
  req.end();
};

createShift();
