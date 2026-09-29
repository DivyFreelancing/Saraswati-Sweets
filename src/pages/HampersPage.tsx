import React, { useEffect, useState } from 'react';
import { GiftHamper } from '../types/database';
import { catalogService } from '../services/catalogService';
import { HamperCard } from '../components/common/HamperCard';
import { Gift, Sparkles } from 'lucide-react';

export const HampersPage: React.FC = () => {
  const [hampers, setHampers] = useState<GiftHamper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogService.getGiftHampers().then((data) => {
      setHampers(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538] uppercase tracking-wider">
          <Gift className="w-4 h-4 text-[#C9A227]" />
          <span>Curated Royal Packaging</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1F1B16] tracking-tight">
          Festive & Wedding Gift Hampers
        </h1>
        <p className="text-sm sm:text-base text-[#6B6258] max-w-2xl">
          Luxury handcrafted gift boxes wrapped in raw silk and embossed gold foil, filled with our finest cashew fudges, roasted peda, and premium dry fruits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {hampers.map((hamper) => (
          <HamperCard key={hamper.id} hamper={hamper} />
        ))}
      </div>
    </div>
  );
};
