import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Package, Clock } from 'lucide-react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
} from '@heroui/react';
import { supabase } from '../lib/supabase';

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    product: {
      name: string;
    };
    variant: {
      dosage_mg: number;
    };
  }>;
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('orderId');

      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            customer_email,
            total_amount,
            order_status,
            payment_status,
            created_at,
            order_items (
              quantity,
              unit_price,
              product:products (name),
              variant:product_variants (dosage_mg)
            )
          `)
          .eq('id', orderId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setOrderDetails(data as OrderDetails);

          if (data.payment_status === 'completed' && data.order_status === 'pending') {
            await supabase
              .from('orders')
              .update({ order_status: 'paid' })
              .eq('id', orderId);
          }
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, []);

  const copyOrderId = () => {
    if (orderDetails) {
      navigator.clipboard.writeText(orderDetails.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4" shadow="sm">
          <CardBody className="text-center gap-4 py-10 px-8">
            <h1 className="text-2xl font-light text-gray-900">Order Not Found</h1>
            <p className="text-gray-600">
              We couldn't find your order. Please check your email for order confirmation.
            </p>
            <Button
              color="primary"
              onPress={() => navigate('/')}
              className="mt-2"
            >
              Return to Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card shadow="sm" className="border border-gray-200 overflow-hidden">
          {/* Success Header */}
          <div className="bg-success-50 border-b border-success-100 p-8 text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success-600" />
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600">
              Thank you for your order, {orderDetails.customer_name}
            </p>
            <Chip color="success" variant="flat" className="mt-3">
              Payment Successful
            </Chip>
          </div>

          <CardBody className="p-8 gap-8">
            {/* Order ID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Your Order ID</span>
                <Button
                  size="sm"
                  variant="light"
                  color="primary"
                  startContent={<Copy className="w-4 h-4" />}
                  onPress={copyOrderId}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <Card className="bg-gray-50 border border-gray-200">
                <CardBody className="flex-row items-center gap-3 py-3">
                  <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 font-mono text-sm break-all">{orderDetails.id}</span>
                </CardBody>
              </Card>
              <p className="mt-2 text-sm text-gray-500">
                Save this Order ID to track your shipment
              </p>
            </div>

            <Divider />

            {/* What's Next */}
            <Card className="bg-primary-50 border border-primary-100">
              <CardBody className="gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium text-primary-900">What's Next?</span>
                </div>
                <ul className="text-sm text-primary-800 space-y-1 ml-7">
                  <li>• We're preparing your order for shipment</li>
                  <li>• You'll receive tracking information via email within 24-48 hours</li>
                  <li>• Use your Order ID to check status anytime</li>
                </ul>
              </CardBody>
            </Card>

            <Divider />

            {/* Order Summary */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {orderDetails.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-900">{item.product.name}</span>
                      <span className="text-gray-500"> ({item.variant.dosage_mg}mg)</span>
                      <span className="text-gray-500"> × {item.quantity}</span>
                    </div>
                    <span className="text-gray-900 font-medium">
                      ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <Divider className="my-4" />
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Total Amount</span>
                <span className="text-xl font-medium text-gray-900">
                  ₹{orderDetails.total_amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <Divider />

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                color="primary"
                fullWidth
                onPress={() => navigate('/catalogue')}
              >
                Track Your Order
              </Button>
              <Button
                variant="bordered"
                fullWidth
                onPress={() => navigate('/catalogue')}
              >
                Continue Shopping
              </Button>
            </div>
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-sm text-gray-500">
          Order confirmation has been sent to {orderDetails.customer_email}
        </p>
      </div>
    </div>
  );
}
