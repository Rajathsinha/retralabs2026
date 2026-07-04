import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, MessageSquare } from 'lucide-react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Divider,
} from '@heroui/react';

export default function PaymentFailedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card shadow="sm" className="border border-gray-200 overflow-hidden">
          {/* Error Header */}
          <div className="bg-danger-50 border-b border-danger-100 p-8 text-center">
            <div className="w-20 h-20 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-danger-600" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Payment Failed</h1>
            <Chip color="danger" variant="flat" className="mt-1">
              Transaction Unsuccessful
            </Chip>
          </div>

          <CardBody className="p-8 gap-6">
            <div className="text-center">
              <p className="text-gray-600 mb-2">
                Unfortunately, your payment could not be processed. Please try again.
              </p>
              <p className="text-sm text-gray-500">
                If you continue to experience issues, please contact our support team.
              </p>
            </div>

            <Divider />

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

            <Divider />

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <Button
                color="primary"
                fullWidth
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={() => navigate('/checkout')}
              >
                Try Again
              </Button>
              <Button
                as="a"
                href="https://wa.me/918217824384?text=Hello%2C%20I%20need%20help%20with%20a%20failed%20payment%20on%20RetraLabs"
                target="_blank"
                rel="noopener noreferrer"
                color="success"
                variant="flat"
                fullWidth
                startContent={<MessageSquare className="w-4 h-4" />}
              >
                Contact Support on WhatsApp
              </Button>
              <Button
                variant="light"
                fullWidth
                onPress={() => navigate('/')}
              >
                Return to Home
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
