// Test script for Insurance Form API
const apiBase = 'http://localhost:5000';

async function testInsuranceFormAPI() {
  console.log('🧪 Testing Insurance Form API...\n');

  // Test 1: Check if backend is running
  try {
    const res = await fetch(`${apiBase}/`);
    const text = await res.text();
    console.log('✅ Backend is running');
    console.log(`   Response: ${text.substring(0, 50)}...\n`);
  } catch (err) {
    console.error('❌ Backend is not running:', err.message);
    console.log('   Please start the backend server first!\n');
    return;
  }

  // Test 2: Test login to get token
  console.log('🔐 Testing login...');
  try {
    const loginRes = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'Admin@12345',
        role: 'admin'
      })
    });

    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginRes.status, loginRes.statusText);
      return;
    }

    const loginData = await loginRes.json();
    if (loginData.status !== 'success' || !loginData.token) {
      console.error('❌ Login response invalid:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Test 3: Get employees list
    console.log('👥 Getting employees list...');
    const empRes = await fetch(`${apiBase}/api/admin/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!empRes.ok) {
      console.error('❌ Failed to get employees:', empRes.status);
      return;
    }

    const empData = await empRes.json();
    const employees = empData.employees || [];
    console.log(`✅ Found ${employees.length} employees`);

    if (employees.length === 0) {
      console.log('⚠️  No employees found. Cannot test form save.');
      return;
    }

    const testEmployee = employees[0];
    console.log(`   Using employee: ${testEmployee.name} (ID: ${testEmployee.id})\n`);

    // Test 4: Save form data
    console.log('💾 Testing save form data...');
    const formData = {
      name: testEmployee.name.toUpperCase(),
      dateOfBirth: '1990-01-01',
      gender: 'Nam',
      nationality: 'VN',
      nationalityName: 'Việt Nam',
      addressCountry: 'VN',
      addressCountryName: 'Việt Nam',
      addressProvinceCode: 'HN',
      addressProvince: 'Hà Nội',
      idNumber: '123456789',
      phoneNumber: '0900000000'
    };

    const saveRes = await fetch(`${apiBase}/api/insurance-forms/save`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testEmployee.id,
        formType: 'TK1_TS',
        formData: formData
      })
    });

    const saveData = await saveRes.json();
    if (saveRes.ok && saveData.status === 'success') {
      console.log('✅ Form saved successfully');
      console.log(`   Form ID: ${saveData.data.id}`);
      console.log(`   Version: ${saveData.data.version}\n`);
    } else {
      console.error('❌ Failed to save form:', saveData);
      return;
    }

    // Test 5: Get saved form data
    console.log('📥 Testing get form data...');
    const getRes = await fetch(`${apiBase}/api/insurance-forms/${testEmployee.id}/TK1_TS`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const getData = await getRes.json();
    if (getRes.ok && getData.status === 'success' && getData.data) {
      console.log('✅ Form data retrieved successfully');
      console.log(`   Form Type: ${getData.data.formType}`);
      console.log(`   Has formData: ${!!getData.data.formData}`);
      console.log(`   Name in form: ${getData.data.formData.name || 'N/A'}\n`);
    } else {
      console.error('❌ Failed to get form:', getData);
      return;
    }

    console.log('✨ All tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Backend is running');
    console.log('   ✅ Authentication works');
    console.log('   ✅ Can get employees');
    console.log('   ✅ Can save form data');
    console.log('   ✅ Can retrieve saved form data');
    console.log('\n🎉 Insurance Form API is working correctly!');

  } catch (err) {
    console.error('❌ Test error:', err.message);
    console.error(err.stack);
  }
}

// Run tests
testInsuranceFormAPI();

