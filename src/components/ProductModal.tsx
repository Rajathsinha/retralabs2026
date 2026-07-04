import { Check } from 'lucide-react';
import { ProductWithVariants, ProductVariant } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Card,
  CardBody,
} from '@heroui/react';

interface ProductModalProps {
  product: ProductWithVariants;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (variant: ProductVariant) => void;
  addedVariantId: string | null;
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, addedVariantId }: ProductModalProps) {
  const { format } = useCurrency();
  const isFlagship = product.name === 'Retatrutide' || product.name === 'Tirzepatide';
  const isBacWater = product.name === 'Bacteriostatic Water (Pharma Grade)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        base: 'rounded-2xl',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-3 pb-2">
          <div className="flex gap-2">
            {isFlagship && (
              <Chip color="default" variant="solid" size="sm" classNames={{ base: 'bg-black text-white' }}>
                FLAGSHIP
              </Chip>
            )}
            {product.name === 'Retatrutide' && (
              <Chip color="secondary" variant="solid" size="sm">
                MOST POPULAR
              </Chip>
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {product.name}
          </h2>
          <p className="text-gray-600 font-normal text-base">
            {product.description}
          </p>
        </ModalHeader>

        <ModalBody className="gap-3">
          {product.variants.map((variant) => {
            const isAdded = addedVariantId === variant.id;

            return (
              <Card key={variant.id} shadow="none" classNames={{ base: 'bg-gray-50 border border-gray-100' }}>
                <CardBody className="flex-row items-center justify-between p-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {isBacWater ? `${variant.dosage_mg}ML` : `${variant.dosage_mg}mg`}
                      </h3>
                      {variant.in_stock ? (
                        <Chip color="secondary" variant="solid" size="sm">IN STOCK</Chip>
                      ) : (
                        <Chip color="default" variant="solid" size="sm">LIMITED</Chip>
                      )}
                    </div>
                    {variant.vial_configuration && (
                      <p className="text-sm text-gray-500 mb-2">
                        {variant.vial_configuration}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-gray-900">
                      {format(variant.price_inr)}
                    </p>
                  </div>

                  <Button
                    color={isAdded ? 'success' : 'default'}
                    variant={isAdded ? 'solid' : 'solid'}
                    isDisabled={!variant.in_stock}
                    onPress={() => onAddToCart(variant)}
                    className={`font-bold ${!isAdded && variant.in_stock ? 'bg-gray-900 text-white' : ''}`}
                  >
                    {isAdded ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Added
                      </span>
                    ) : (
                      'Add to Research'
                    )}
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </ModalBody>

        <ModalFooter className="justify-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide text-center">
            For in-vitro research only. Not for human consumption.
          </p>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
