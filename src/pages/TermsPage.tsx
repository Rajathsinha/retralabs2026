import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
} from '@heroui/react';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Back Button */}
        <Button
          variant="light"
          startContent={<ArrowLeft className="w-4 h-4" />}
          onPress={() => navigate(-1)}
          className="mb-6 -ml-2"
        >
          Back
        </Button>

        {/* Page Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
        <p className="text-gray-500 mb-8">Last Updated: February 1, 2026</p>

        {/* Important Notice Card */}
        <Card shadow="sm" className="border border-warning-200 bg-warning-50 mb-4">
          <CardHeader className="px-6 pt-6 pb-2 flex items-center gap-3">
            <Chip color="warning" variant="flat" size="sm">Important Notice</Chip>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <p className="text-warning-900 font-semibold mb-2">RESEARCH USE ONLY</p>
            <p className="text-warning-800 leading-relaxed">
              All products sold on this website are strictly for research purposes only. These products
              are NOT intended for human consumption, medical use, dietary supplements, or any application
              outside of controlled laboratory environments. By purchasing, you confirm that you understand
              and agree to use products solely for legitimate research purposes.
            </p>
          </CardBody>
        </Card>

        {/* Main Content Card */}
        <Card shadow="sm" className="border border-gray-200">
          <CardBody className="p-8 gap-0">

            {/* Agreement to Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using this website, you accept and agree to be bound by these Terms and
                Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Eligibility</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To purchase from our website, you must:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Be at least 18 years of age</li>
                <li>Have the legal authority to enter into binding contracts</li>
                <li>Be affiliated with or represent a legitimate research institution or organization</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Product Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Information</h2>
              <p className="text-gray-700 leading-relaxed">
                We strive to provide accurate product descriptions and specifications. However, we do not
                warrant that product information is complete, accurate, or error-free. We reserve the right
                to correct errors, inaccuracies, or omissions and to change or update information at any time
                without prior notice.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Orders and Pricing */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Orders and Pricing</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>All prices are listed in Indian Rupees (INR) unless otherwise stated</li>
                <li>Prices are subject to change without notice</li>
                <li>We reserve the right to refuse or cancel any order for any reason</li>
                <li>Order confirmation does not guarantee product availability</li>
                <li>Payment must be completed before order processing begins</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Payment Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                Payment must be made in full at the time of purchase. We accept payment through authorized
                payment gateways. All payment transactions are processed securely. You are responsible for
                ensuring payment information is accurate and current.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Shipping and Delivery */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Shipping and Delivery</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Shipping times are estimates and not guaranteed</li>
                <li>We are not responsible for delays caused by shipping carriers or customs</li>
                <li>Risk of loss passes to you upon delivery to the shipping carrier</li>
                <li>You are responsible for providing accurate shipping information</li>
                <li>Special handling requirements apply to maintain product integrity</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Product Liability and Disclaimer */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Liability and Disclaimer</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Products are provided "as is" without warranties of any kind. We make no representations about:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Fitness for any particular purpose beyond research use</li>
                <li>Results or outcomes from product use</li>
                <li>Compatibility with specific research protocols</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We shall not be liable for any direct, indirect, incidental, or consequential damages arising
                from product use or misuse.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Prohibited Uses */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">You agree NOT to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Use products for human consumption or medical purposes</li>
                <li>Resell or redistribute products without authorization</li>
                <li>Misrepresent the intended use of products</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Use products in any manner that could cause harm</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content on this website, including text, graphics, logos, and software, is our property
                or that of our licensors and is protected by copyright and intellectual property laws. You may
                not reproduce, distribute, or create derivative works without written permission.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                To the maximum extent permitted by law, we shall not be liable for any damages, including but
                not limited to direct, indirect, incidental, consequential, or punitive damages arising from
                your use of our website or products.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify and hold us harmless from any claims, damages, liabilities, and expenses
                arising from your use of products, violation of these terms, or violation of any applicable laws.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms and Conditions are governed by the laws of India. Any disputes shall be subject to
                the exclusive jurisdiction of the courts located in India.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms and Conditions at any time. Changes will be effective
                immediately upon posting. Your continued use of the website after changes constitutes acceptance
                of the modified terms.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions about these Terms and Conditions, please contact us at:
              </p>
              <p className="text-cyan-600 font-medium mt-2">support@retralabs.in</p>
            </section>

            <Divider className="my-8" />

            {/* Acknowledgement */}
            <section>
              <p className="text-sm text-gray-600 italic">
                By placing an order, you acknowledge that you have read, understood, and agree to be bound by
                these Terms and Conditions.
              </p>
            </section>

          </CardBody>
        </Card>
      </div>
    </div>
  );
}
