async function testLiveLogin() {
  try {
    const res = await fetch('https://ats.whitehorsemanpower.in/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 'demo@whitehorsemanpower.in',
        password: 'DemoAdmin@2026'
      })
    });

    const data = await res.json();
    console.log('Login Status:', res.status, 'User:', data.user?.name, 'Role:', data.user?.role);

    if (data.token) {
      // 1. Check /api/candidates
      const candRes = await fetch('https://ats.whitehorsemanpower.in/api/candidates?page=1&limit=5', {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const candData = await candRes.json();
      console.log('Candidates Total:', candData.total || candData.pagination?.total);

      // 2. Check /api/dashboard/admin
      const dashRes = await fetch('https://ats.whitehorsemanpower.in/api/dashboard/admin', {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const dashData = await dashRes.json();
      console.log('Admin Dashboard Candidates Count:', dashData.totalCandidates || dashData.stats?.totalCandidates || dashData.metrics?.totalCandidates);
      console.log('Admin Dashboard Open Positions:', dashData.openPositions || dashData.stats?.openPositions);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testLiveLogin();
