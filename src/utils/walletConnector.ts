
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Wallet connection types
export type WalletType = 'ethereum' | 'solana';

export interface WalletConnectionResult {
  success: boolean;
  address?: string;
  error?: string;
}

/**
 * Connect to an Ethereum wallet (MetaMask)
 * @returns Promise with wallet connection result
 */
export const connectEthereumWallet = async (): Promise<WalletConnectionResult> => {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      return {
        success: false,
        error: 'MetaMask is not installed. Please install MetaMask to connect your Ethereum wallet.'
      };
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    if (accounts.length === 0) {
      return {
        success: false,
        error: 'No Ethereum accounts found. Please create an account in MetaMask and try again.'
      };
    }

    // Return the first account
    return {
      success: true,
      address: accounts[0]
    };
  } catch (error) {
    console.error('Error connecting to Ethereum wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Ethereum wallet'
    };
  }
};

/**
 * Connect to a Solana wallet (Phantom)
 * @returns Promise with wallet connection result
 */
export const connectSolanaWallet = async (): Promise<WalletConnectionResult> => {
  try {
    // Check if Phantom is installed
    const provider = window.solana;
    if (!provider) {
      return {
        success: false,
        error: 'Phantom wallet is not installed. Please install Phantom to connect your Solana wallet.'
      };
    }

    // Connect to Phantom
    await provider.connect();
    
    // Check if connection was successful
    if (!provider.isConnected) {
      return {
        success: false,
        error: 'Failed to connect to Phantom wallet'
      };
    }

    // Get the public key
    const publicKey = provider.publicKey?.toString();
    
    if (!publicKey) {
      return {
        success: false,
        error: 'Could not retrieve public key from Phantom wallet'
      };
    }

    return {
      success: true,
      address: publicKey
    };
  } catch (error) {
    console.error('Error connecting to Solana wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Solana wallet'
    };
  }
};

/**
 * Update user profile with wallet address
 * @param userId The user ID
 * @param walletType The wallet type (ethereum or solana)
 * @param address The wallet address
 * @returns Promise with update result
 */
export const updateWalletAddress = async (
  userId: string,
  walletType: WalletType,
  address: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const column = walletType === 'ethereum' ? 'ethereum_address' : 'solana_address';
    
    const { error } = await supabase
      .from('profiles')
      .update({ [column]: address })
      .eq('id', userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error(`Error updating ${walletType} address:`, error);
    return {
      success: false,
      error: error.message || `Failed to update ${walletType} address`
    };
  }
};
