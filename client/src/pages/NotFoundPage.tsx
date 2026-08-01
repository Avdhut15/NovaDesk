import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4 gap-4">
      <span className="text-6xl font-black text-gray-200">404</span>
      <h1 className="text-xl font-bold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500">The page you're looking for doesn't exist.</p>
      <Link
        to="/dashboard"
        className="mt-2 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
