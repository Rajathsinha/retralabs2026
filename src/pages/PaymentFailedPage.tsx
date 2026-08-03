import { useSEO } from '../hooks/useSEO';
import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, MessageSquare } from 'lucide-react';

export default function PaymentFailedPage() {
  const navigate = useNavigate();
  useSEO({ title: 'Payment Failed | RetraLabs', description: 'Your payment could not be completed.', noindex: true });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Error Header */}
        <div className="bg-red-50 border-b border-red-100 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Payment Failed</h1>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 mt-1">
            Transaction Unsuccessful
          </span>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              Unfortunately, your payment could not be processed. Please try again.
            </p>
            <p className="text-sm text-gray-500">
              If you continue to experience issues, please contact our support team.
            </p>
          </div>

          <hr className="border-slate-200 my-4" />

          {/* Common Reasons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Common reasons for payment failure:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Insufficient funds or card limit exceeded</li>
              <li>• Incorrect card details entered</li>
              <li>• Bank declined the transaction</li>
              <li>• Network or connectivity issues</li>
            </ul>
          </div>

          <hr className="border-slate-200 my-4" />

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="https://wa.me/918217824384?text=Hello%2C%20I%20need%20help%20with%20a%20failed%20payment%20on%20RetraLabs"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Support on WhatsApp
            </a>
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
