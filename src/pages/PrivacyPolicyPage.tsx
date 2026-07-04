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

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last Updated: February 1, 2026</p>

        {/* Introduction */}
        <Card shadow="sm" className="border border-gray-200 mb-4">
          <CardHeader className="px-6 pt-6 pb-2 flex items-center gap-3">
            <Chip color="primary" variant="flat" size="sm">Introduction</Chip>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <p className="text-gray-700 leading-relaxed">
              This Privacy Policy describes how we collect, use, and protect your personal information when
              you use our website and services. We are committed to ensuring your privacy and protecting your
              personal data.
            </p>
          </CardBody>
        </Card>

        {/* Main Content Card */}
        <Card shadow="sm" className="border border-gray-200">
          <CardBody className="p-8 gap-0">

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Name and contact details (email, phone number)</li>
                    <li>Shipping and billing addresses</li>
                    <li>Payment information (processed securely through payment providers)</li>
                    <li>Order history and preferences</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Automatic Information</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>IP address and browser type</li>
                    <li>Device information and operating system</li>
                    <li>Pages visited and time spent on our website</li>
                    <li>Referring website addresses</li>
                  </ul>
                </div>
              </div>
            </section>

            <Divider className="my-8" />

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your purchases</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send important updates about our services</li>
                <li>Improve our website and services</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Information Sharing */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your
                information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>With shipping providers to deliver your orders</li>
                <li>With payment processors to complete transactions</li>
                <li>When required by law or to protect our legal rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement industry-standard security measures to protect your personal information from
                unauthorized access, disclosure, alteration, or destruction. This includes encryption, secure
                servers, and regular security audits. However, no method of transmission over the internet is
                100% secure.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                We use cookies and similar technologies to enhance your browsing experience, analyze site
                traffic, and personalize content. You can control cookie settings through your browser
                preferences.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </section>

            <Divider className="my-8" />

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined
                in this policy, comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Third-Party Links */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Links</h2>
              <p className="text-gray-700 leading-relaxed">
                Our website may contain links to third-party websites. We are not responsible for the privacy
                practices of these external sites. We encourage you to review their privacy policies.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not intended for individuals under 18 years of age. We do not knowingly
                collect personal information from children.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by
                posting the new policy on this page with an updated revision date.
              </p>
            </section>

            <Divider className="my-8" />

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy or how we handle your personal information,
                please contact us at:
              </p>
              <p className="text-cyan-600 font-medium mt-2">support@retralabs.in</p>
            </section>

          </CardBody>
        </Card>
      </div>
    </div>
  );
}
