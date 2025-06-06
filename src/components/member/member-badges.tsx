
'use client';

import type { MemberRegistrationData } from '@/types';
import { Award, Star, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MemberBadgesProps {
  memberData: Pick<MemberRegistrationData, 'adminRating' | 'recommendationsGivenCount'>;
  className?: string;
}

const badgeConfig = [
  {
    name: 'Perekomen Ahli',
    icon: Award,
    color: 'text-yellow-500 fill-yellow-500/20',
    tooltip: 'Telah memberikan 5 atau lebih rekomendasi.',
    condition: (data: MemberBadgesProps['memberData']) => (data.recommendationsGivenCount || 0) >= 5,
  },
  {
    name: 'Kontributor Aktif',
    icon: Star, // Using filled star by applying fill color
    color: 'text-blue-500 fill-blue-500/20',
    tooltip: 'Aktif memberikan rekomendasi (min. 1) dan memiliki rating baik (min. 4 bintang).',
    condition: (data: MemberBadgesProps['memberData']) => (data.recommendationsGivenCount || 0) >= 1 && (data.adminRating || 0) >= 4,
  },
  {
    name: 'Anggota Panutan',
    icon: ShieldCheck,
    color: 'text-green-600 fill-green-600/20',
    tooltip: 'Memiliki rating sempurna (5 bintang) dan kontribusi rekomendasi yang baik (min. 3).',
    condition: (data: MemberBadgesProps['memberData']) => (data.adminRating || 0) === 5 && (data.recommendationsGivenCount || 0) >= 3,
  },
];

export default function MemberBadges({ memberData, className }: MemberBadgesProps) {
  const earnedBadges = badgeConfig.filter(badge => badge.condition(memberData));

  if (earnedBadges.length === 0) {
    // Optionally return a placeholder or null
    // return <p className={cn("text-xs text-muted-foreground", className)}>Belum ada lencana</p>;
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex items-center space-x-1.5", className)}>
        {earnedBadges.map(badge => (
          <Tooltip key={badge.name}>
            <TooltipTrigger asChild>
              <span className="inline-block p-0.5 rounded-full bg-background"> {/* Added a slight background for better visibility on varied card backgrounds */}
                <badge.icon className={cn("h-5 w-5", badge.color)} strokeWidth={2} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover text-popover-foreground">
              <p className="font-semibold">{badge.name}</p>
              <p className="text-xs">{badge.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
