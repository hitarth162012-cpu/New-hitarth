import React, { useState } from 'react';
import {
  Landmark,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Percent,
  Banknote,
  DollarSign,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { WalletState, BankLoanState } from '../../types';

interface BankSectionProps {
  wallet: WalletState;
  onUpdateWallet: (updater: (prev: WalletState) => WalletState) => void;
  onAddNotification?: (text: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const BankSection: React.FC<BankSectionProps> = ({
  wallet,
  onUpdateWallet,
  onAddNotification,
}) => {
  const [loanAmount, setLoanAmount] = useState<number>(25000);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [emiAmount, setEmiAmount] = useState<number>(5000);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const activeLoan = wallet.loan;
  const hasActiveLoan = activeLoan && activeLoan.remainingAmount > 0;

  const handleTakeLoan = () => {
    if (hasActiveLoan) {
      setStatusMsg({
        text: 'You already have an active loan. Please repay it before taking a new one.',
        type: 'error',
      });
      return;
    }

    if (loanAmount < 1000 || loanAmount > 100000) {
      setStatusMsg({
        text: 'Loan amount must be between ₹1,000 and ₹100,000.',
        type: 'error',
      });
      return;
    }

    const newLoan: BankLoanState = {
      id: `LOAN-${Date.now().toString(36).toUpperCase()}`,
      principal: loanAmount,
      interestRatePercent: interestRate,
      remainingAmount: loanAmount,
      accumulatedInterest: 0,
      accruedInterest: 0,
      totalRepaid: 0,
      takenAt: Date.now(),
      createdAt: Date.now(),
      lastInterestAccruedAt: Date.now(),
      lastInterestAccrualAt: Date.now(),
    };

    onUpdateWallet((prev) => ({
      ...prev,
      balanceINR: prev.balanceINR + loanAmount,
      loan: newLoan,
      transactions: [
        {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'bank_loan',
          game: 'Central Bank',
          amount: loanAmount,
          note: `🏦 Instant Bank Loan Approved: ₹${loanAmount.toLocaleString()} @ ${interestRate}% interest`,
          description: `🏦 Instant Bank Loan Approved: ₹${loanAmount.toLocaleString()} @ ${interestRate}% interest`,
          timestamp: Date.now(),
        },
        ...prev.transactions.slice(0, 49),
      ],
    }));

    setStatusMsg({
      text: `🎉 Loan of ₹${loanAmount.toLocaleString()} credited to your balance successfully!`,
      type: 'success',
    });
    if (onAddNotification) {
      onAddNotification(`🏦 Bank Loan of ₹${loanAmount.toLocaleString()} credited!`, 'success');
    }
  };

  const handlePayEmi = (amountToPay: number) => {
    if (!hasActiveLoan || !activeLoan) return;

    const totalDue = activeLoan.remainingAmount;
    const payment = Math.min(amountToPay, totalDue);

    if (wallet.balanceINR < payment) {
      setStatusMsg({
        text: `Insufficient funds. You need ₹${payment.toLocaleString()} to pay this installment.`,
        type: 'error',
      });
      return;
    }

    const newRemaining = Math.max(0, totalDue - payment);
    const currentRepaid = activeLoan.totalRepaid || 0;
    const newRepaid = currentRepaid + payment;
    const isFullyPaid = newRemaining <= 0;

    onUpdateWallet((prev) => ({
      ...prev,
      balanceINR: prev.balanceINR - payment,
      loan: isFullyPaid
        ? null
        : {
            ...activeLoan,
            remainingAmount: newRemaining,
            totalRepaid: newRepaid,
          },
      transactions: [
        {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'bank_repayment',
          game: 'Central Bank',
          amount: payment,
          note: isFullyPaid
            ? `🏦 Loan Cleared in Full! Total Repaid: ₹${newRepaid.toLocaleString()}`
            : `🏦 Loan EMI Payment: Paid ₹${payment.toLocaleString()} (${newRemaining.toLocaleString()} remaining)`,
          description: isFullyPaid
            ? `🏦 Loan Cleared in Full! Total Repaid: ₹${newRepaid.toLocaleString()}`
            : `🏦 Loan EMI Payment: Paid ₹${payment.toLocaleString()} (${newRemaining.toLocaleString()} remaining)`,
          timestamp: Date.now(),
        },
        ...prev.transactions.slice(0, 49),
      ],
    }));

    setStatusMsg({
      text: isFullyPaid
        ? '🎊 Congratulations! Your bank loan has been completely paid off!'
        : `✅ Repaid ₹${payment.toLocaleString()}. Remaining balance: ₹${newRemaining.toLocaleString()}.`,
      type: 'success',
    });
    if (onAddNotification) {
      onAddNotification(
        isFullyPaid ? '🎊 Loan completely repaid!' : `✅ Loan installment of ₹${payment.toLocaleString()} paid!`,
        'success'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-emerald-950/40 to-slate-900/90 border border-emerald-500/30 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Landmark className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-wide">HITARTH CENTRAL BANK</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instant Virtual Credit
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Take virtual loans up to <strong className="text-emerald-400">₹100,000</strong>. Choose your EMI interest rate, with real-time per-minute interest accrued while online.
              </p>
            </div>
          </div>
          <div className="text-right bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3">
            <div className="text-xs text-slate-400">Current Balance</div>
            <div className="text-2xl font-extrabold text-emerald-400">₹{wallet.balanceINR.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Active Loan Dashboard */}
      {hasActiveLoan && activeLoan ? (
        <div className="rounded-2xl bg-slate-900/80 border border-amber-500/40 p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-lg font-bold text-amber-300">ACTIVE LOAN IN PROGRESS</h3>
              <span className="text-xs text-slate-400 font-mono">({activeLoan.id || 'ACTIVE'})</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              Interest Accrues Per Minute Online
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Original Principal</div>
              <div className="text-xl font-bold text-white mt-1">₹{activeLoan.principal.toLocaleString()}</div>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Interest Rate</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{activeLoan.interestRatePercent}% APR</div>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">Accrued Interest</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                ₹{Math.round(activeLoan.accruedInterest || activeLoan.accumulatedInterest || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-rose-500/30 bg-rose-950/10">
              <div className="text-xs text-rose-300">Total Debt Remaining</div>
              <div className="text-xl font-extrabold text-rose-400 mt-1">₹{Math.ceil(activeLoan.remainingAmount).toLocaleString()}</div>
            </div>
          </div>

          {/* Repayment Options */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Repay EMI Installment
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1000, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handlePayEmi(amt)}
                  disabled={wallet.balanceINR < Math.min(amt, activeLoan.remainingAmount)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-emerald-600/30 text-white border border-slate-700 hover:border-emerald-500/50 text-sm font-semibold transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  Pay ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="flex-1 flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2">
                <span className="text-slate-400 text-sm mr-2">₹</span>
                <input
                  type="number"
                  min="500"
                  max={Math.ceil(activeLoan.remainingAmount)}
                  value={emiAmount}
                  onChange={(e) => setEmiAmount(Number(e.target.value))}
                  className="bg-transparent flex-1 text-white font-semibold text-sm outline-none"
                  placeholder="Custom EMI amount"
                />
              </div>
              <button
                onClick={() => handlePayEmi(emiAmount)}
                disabled={wallet.balanceINR < emiAmount || emiAmount <= 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20 disabled:opacity-40"
              >
                Pay Custom EMI
              </button>
              <button
                onClick={() => handlePayEmi(activeLoan.remainingAmount)}
                disabled={wallet.balanceINR < activeLoan.remainingAmount}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-40"
              >
                Pay Off In Full (₹{Math.ceil(activeLoan.remainingAmount).toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Take a New Loan Form */
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Apply for a New Virtual Bank Loan</h3>
          </div>

          {/* Amount presets & slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">Select Loan Amount:</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">₹{loanAmount.toLocaleString()}</span>
            </div>

            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setLoanAmount(amt)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                    loanAmount === amt
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">Choose Interest Rate (Annual %):</span>
              <span className="text-lg font-bold text-amber-400 font-mono">{interestRate}%</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { rate: 5, label: 'Low (5%)' },
                { rate: 8, label: 'Standard (8%)' },
                { rate: 10, label: 'Recommended (10%)' },
                { rate: 15, label: 'High (15%)' },
                { rate: 20, label: 'Fast Credit (20%)' },
              ].map((item) => (
                <button
                  key={item.rate}
                  onClick={() => setInterestRate(item.rate)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border transition ${
                    interestRate === item.rate
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              ⚡ Per-minute interest: <strong className="text-slate-200">~₹{Math.max(1, Math.round((loanAmount * (interestRate / 100)) / (60 * 24)))}/min</strong> while you are online.
            </p>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Maximum Loan Limit:</span>
              <span className="text-white font-semibold">₹100,000</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Disbursal Time:</span>
              <span className="text-emerald-400 font-semibold">Instant (0 Seconds)</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Repayment Mode:</span>
              <span className="text-white font-semibold">Flexible Online EMI or Lump Sum</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleTakeLoan}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-base transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            Accept & Disburse ₹{loanAmount.toLocaleString()} Instantly
          </button>
        </div>
      )}

      {/* Rules & Information */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 p-5 space-y-2 text-xs text-slate-400">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          HITARTH Central Bank Policy:
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>Loans are 100% virtual credits for gaming, animal hunting, and economy battles.</li>
          <li>Interest is calculated proportionally per minute while your session is active.</li>
          <li>You can make partial EMI payments anytime to reduce your ongoing interest.</li>
          <li>Highest loan ceiling across all tiers is capped at ₹100,000.</li>
        </ul>
      </div>
    </div>
  );
};
