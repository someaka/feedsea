import loginUser from '../../components/login/loginService';

export async function POST(event) {
  const request = event.request;
  const { username, password } = await request.json();

  try {
    const loginResult = await loginUser(username, password);
    if (loginResult.authenticated && loginResult.sessionCookie) {
      const newCookie = `sessionid=${loginResult.sessionCookie}; HttpOnly; Secure; SameSite=None; Max-Age=3600`;
      const options: ResponseInit = {
        status:  200,
        headers: {
          'Set-Cookie': newCookie,
        },
      };
      return new Response(JSON.stringify({ authenticated: true }), options);
    } else {
      return new Response(JSON.stringify({ authenticated: false, error: loginResult.error }), { status:  401 });
    }
  } catch (error) {
    const err = error instanceof Error ? error.message : error;
    return new Response(JSON.stringify({ authenticated: false, error: err }), { status:  500 });
  }
}