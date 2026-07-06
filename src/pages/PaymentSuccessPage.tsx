import { useSEO } from '../hooks/useSEO';
import { useNavigate } from 'react-router-dom';
import { Check, Package } from 'lucide-react';
import { Card, CardBody, Button } from '@heroui/react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  useSEO({ title: 'Payment Successful | RetraLabs', description: 'Your payment was received.', noindex: true });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full" shadow="sm">
        <CardBody className="text-center gap-6 py-12 px-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Thank you for your order. You will receive a confirmation on WhatsApp and email shortly. We'll process and dispatch your order within 24 hours.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3 text-left">
            <Package className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              Standard delivery: 3–4 days (Tier 1/2 cities) · 4–6 days (remote areas).<br />
              Express delivery: 1–2 days (major cities).
            </p>
          </div>
          <Button color="primary" onPress={() => navigate('/')}>
            Continue Shopping
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
