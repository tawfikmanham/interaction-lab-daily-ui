"use client";

import React from "react";
import { PaymentButton } from "./PaymentButton";

export function PaymentButtonDemo() {
  const handlePayment = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    console.log("Payment processed!");
  };

  return (
    <div className="h-screen w-full overflow-hidden rounded-2xl bg-white">
      <div className="flex h-full w-full items-center justify-center bg-white p-6">
        <div className="flex w-full max-w-md flex-col" style={{ minHeight: "400px" }}>
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-black">
              Secure Checkout
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Complete your purchase securely
            </p>
          </div>

          {/* Payment card */}
          <div className="flex-1 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="space-y-6">
              {/* Order summary */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Product</span>
                  <span className="font-medium text-black">Premium Plan</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-black">12 months</span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-black">Total</span>
                    <span className="text-lg font-semibold text-black">$99.00</span>
                  </div>
                </div>
              </div>

              {/* Payment button */}
              <PaymentButton onPayment={handlePayment} autoResetDelay={3000} />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Apex National Bank</p>
            <p className="mt-1">&copy; 2025 All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentButtonDemo;
