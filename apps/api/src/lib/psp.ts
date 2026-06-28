/**
 * PSP abstraction layer — Paystack, Moniepoint, OPay.
 * Each provider's actual API client is swapped in behind this interface.
 * All money-movement calls go through here so LedgerEntry writes can be
 * co-located with the PSP call in a single transaction boundary.
 */

export type PspProvider = "paystack" | "moniepoint" | "opay";

export interface ResolvedBankAccount {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface PspClient {
  provider: PspProvider;
  resolveAccount(accountNumber: string, bankCode: string): Promise<ResolvedBankAccount>;
  sendOtp(phone: string): Promise<{ reference: string }>;
  verifyOtp(phone: string, otp: string, reference: string): Promise<boolean>;
  initiateTransfer(params: {
    amount: number; // in kobo/lowest denomination
    currency: string;
    accountNumber: string;
    bankCode: string;
    narration: string;
    idempotencyKey: string;
  }): Promise<{ transferCode: string; pspReference: string }>;
}

// Paystack implementation (primary)
export function createPaystackClient(secretKey: string): PspClient {
  const baseUrl = "https://api.paystack.co";
  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  return {
    provider: "paystack",

    async resolveAccount(accountNumber, bankCode) {
      const res = await fetch(
        `${baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers },
      );
      if (!res.ok) throw new Error("Account resolution failed");
      const data = await res.json();
      return {
        accountName: data.data.account_name,
        accountNumber: data.data.account_number,
        bankCode,
      };
    },

    async sendOtp(phone) {
      // Use Paystack's SMS OTP via their verification endpoint
      const res = await fetch(`${baseUrl}/otp/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone, length: 6 }),
      });
      if (!res.ok) throw new Error("OTP send failed");
      const data = await res.json();
      return { reference: data.data.otp_code };
    },

    async verifyOtp(phone, otp, reference) {
      const res = await fetch(`${baseUrl}/otp/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone, otp, reference }),
      });
      return res.ok;
    },

    async initiateTransfer({ amount, currency, accountNumber, bankCode, narration, idempotencyKey }) {
      // 1. Create transfer recipient
      const recipientRes = await fetch(`${baseUrl}/transferrecipient`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "nuban",
          account_number: accountNumber,
          bank_code: bankCode,
          currency,
        }),
      });
      if (!recipientRes.ok) throw new Error("Failed to create transfer recipient");
      const recipientData = await recipientRes.json();
      const recipientCode = recipientData.data.recipient_code;

      // 2. Initiate transfer
      const transferRes = await fetch(`${baseUrl}/transfer`, {
        method: "POST",
        headers: { ...headers, "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          source: "balance",
          amount,
          recipient: recipientCode,
          reason: narration,
        }),
      });
      if (!transferRes.ok) throw new Error("Transfer initiation failed");
      const transferData = await transferRes.json();
      return {
        transferCode: transferData.data.transfer_code,
        pspReference: transferData.data.id?.toString() ?? idempotencyKey,
      };
    },
  };
}

// Factory — returns the right client per provider
export function getPspClient(provider: PspProvider): PspClient {
  switch (provider) {
    case "paystack":
      return createPaystackClient(process.env.PAYSTACK_SECRET_KEY!);
    case "moniepoint":
      // Moniepoint uses similar REST conventions — stub follows same interface
      return createPaystackClient(process.env.MONIEPOINT_SECRET_KEY!); // replace with real impl
    case "opay":
      return createPaystackClient(process.env.OPAY_SECRET_KEY!); // replace with real impl
  }
}
