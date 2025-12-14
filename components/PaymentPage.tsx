import React from 'react';
import { CreditCard, DollarSign, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';

interface PaymentPageProps {
  onBack: () => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full relative z-10 px-4 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Left Side: Pitch */}
        <div className="flex-1 p-6 space-y-6 border-b md:border-b-0 md:border-r border-white/10">
           <button onClick={onBack} className="flex items-center space-x-2 text-secondary hover:text-white transition-colors mb-4">
              <ArrowLeft size={16} />
              <span>Return to Meeting</span>
           </button>
           
           <div>
              <div className="inline-block p-2 bg-neon/10 rounded-xl text-neon mb-4">
                 <ShieldCheck size={32} />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-2">Support Orbits</h2>
              <p className="text-secondary leading-relaxed">
                 Your contribution helps us maintain the neural networks and low-latency translation engines that power Orbits. Join us in breaking down language barriers across the galaxy.
              </p>
           </div>

           <div className="space-y-3 pt-4">
              <div className="flex items-center space-x-3 text-white/80">
                 <CheckCircle2 size={18} className="text-neon" />
                 <span>Secure Stripe Processing</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                 <CheckCircle2 size={18} className="text-neon" />
                 <span>Encrypted Transactions</span>
              </div>
              <div className="flex items-center space-x-3 text-white/80">
                 <CheckCircle2 size={18} className="text-neon" />
                 <span>Support Open Source Development</span>
              </div>
           </div>
        </div>

        {/* Right Side: Payment Form Mock */}
        <div className="flex-1 p-6 flex flex-col justify-center">
            <div className="bg-black/40 rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-lg font-bold text-white">Payment Details</h3>
                   <div className="flex space-x-2 opacity-70">
                      <div className="w-8 h-5 bg-white/20 rounded"></div>
                      <div className="w-8 h-5 bg-white/20 rounded"></div>
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs text-secondary uppercase font-bold">Cardholder Name</label>
                   <input type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-neon outline-none" />
                </div>

                <div className="space-y-1">
                   <label className="text-xs text-secondary uppercase font-bold">Card Number</label>
                   <div className="relative">
                      <CreditCard className="absolute left-3 top-3.5 text-secondary" size={16} />
                      <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-neon outline-none font-mono" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs text-secondary uppercase font-bold">Expiry</label>
                       <input type="text" placeholder="MM/YY" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-neon outline-none text-center" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs text-secondary uppercase font-bold">CVC</label>
                       <input type="text" placeholder="123" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-neon outline-none text-center" />
                    </div>
                </div>

                <div className="pt-4">
                   <button className="w-full bg-neon text-black font-bold py-3 rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)] flex items-center justify-center space-x-2">
                      <DollarSign size={18} />
                      <span>Pay $10.00</span>
                   </button>
                   <p className="text-center text-[10px] text-secondary mt-3">
                      This is a secure 256-bit SSL encrypted payment.
                   </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
