import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { InternalChatProvider } from './context/InternalChatContext';

export default function App() {
  return (
    <AuthProvider>
      <InternalChatProvider>
        <RouterProvider router={router} />
      </InternalChatProvider>
    </AuthProvider>
  );
}

