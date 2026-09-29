import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface UserAddress {
  id: string;
  label: string; // 'Home' | 'Office' | 'Other'
  recipient_name: string;
  recipient_phone: string;
  street_address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

interface AddressContextType {
  addresses: UserAddress[];
  defaultAddress: UserAddress | null;
  isLoading: boolean;
  serviceablePincodes: string[];
  fetchAddresses: () => Promise<void>;
  addAddress: (addressData: Omit<UserAddress, 'id'>) => Promise<{ success: boolean; message?: string }>;
  updateAddress: (id: string, addressData: Partial<UserAddress>) => Promise<{ success: boolean; message?: string }>;
  deleteAddress: (id: string) => Promise<{ success: boolean }>;
  setDefaultAddress: (id: string) => Promise<{ success: boolean }>;
  checkPincodeServiceable: (pincode: string) => boolean;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);
export const SERVICEABLE_PINCODES = ['225001', '225002', '225003', '225122'];

export const AddressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, getAuthHeaders, user } = useAuth();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkPincodeServiceable = (pincode: string): boolean => {
    return SERVICEABLE_PINCODES.includes(pincode.trim());
  };

  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setAddresses([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/addresses', {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error('Failed to load user addresses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses, user?.id]);

  const addAddress = async (addressData: Omit<UserAddress, 'id'>): Promise<{ success: boolean; message?: string }> => {
    if (!checkPincodeServiceable(addressData.pincode)) {
      const msg = `Pincode ${addressData.pincode} is outside our fresh delivery zone. Saraswati Sweets currently delivers to Barabanki pincodes: ${SERVICEABLE_PINCODES.join(', ')}.`;
      showToast(msg, 'warning');
      return { success: false, message: msg };
    }

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(addressData),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Failed to save address', 'error');
        return { success: false, message: data.message };
      }

      await fetchAddresses();
      showToast('Delivery address saved successfully!', 'success');
      return { success: true };
    } catch (err: any) {
      showToast(err.message || 'Error saving address', 'error');
      return { success: false, message: err.message };
    }
  };

  const updateAddress = async (id: string, addressData: Partial<UserAddress>): Promise<{ success: boolean; message?: string }> => {
    if (addressData.pincode && !checkPincodeServiceable(addressData.pincode)) {
      const msg = `Pincode ${addressData.pincode} is not serviceable in Barabanki.`;
      showToast(msg, 'warning');
      return { success: false, message: msg };
    }

    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(addressData),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Failed to update address', 'error');
        return { success: false, message: data.message };
      }

      await fetchAddresses();
      showToast('Address updated successfully', 'success');
      return { success: true };
    } catch (err: any) {
      showToast(err.message || 'Error updating address', 'error');
      return { success: false, message: err.message };
    }
  };

  const deleteAddress = async (id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchAddresses();
        showToast('Address removed', 'info');
        return { success: true };
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
    return { success: false };
  };

  const setDefaultAddress = async (id: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchAddresses();
        showToast('Default delivery address updated', 'success');
        return { success: true };
      }
    } catch (err) {
      console.error('Failed to set default address:', err);
    }
    return { success: false };
  };

  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0] || null;

  return (
    <AddressContext.Provider
      value={{
        addresses,
        defaultAddress,
        isLoading,
        serviceablePincodes: SERVICEABLE_PINCODES,
        fetchAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        checkPincodeServiceable,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddresses = (): AddressContextType => {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddresses must be used within an AddressProvider');
  }
  return context;
};
