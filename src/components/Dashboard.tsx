import React from 'react';
import { MarketOverview } from './common/MarketOverview';
import { ProfileSection } from './dashboard/ProfileSection';
import { QuickActions } from './dashboard/QuickActions';
import { RecentActivity } from './dashboard/RecentActivity';
import { TradeBookSection } from './dashboard/TradeBookSection';
import HelpButton from './common/HelpButton';
import { ApiStatus } from './common/ApiStatus';
import { HELP_CONTENT } from '../utils/helpContent';

/**
 * Simplified Dashboard container component
 * Delegates responsibilities to focused child components
 */
const Dashboard: React.FC = () => {
  return (
    <div className="responsive-container responsive-padding responsive-space">
      {/* Page Header with Help */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-hierarchy-primary">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <ApiStatus showDetails={false} />
          </div>
          <HelpButton helpContent={HELP_CONTENT.dashboard} />
        </div>
      </div>
      
      {/* Profile Section - handles all profile-related functionality */}
      <ProfileSection />

      {/* Market Overview and Quick Actions */}
      <div className="responsive-grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 min-h-0">
          <MarketOverview 
            onSymbolSelect={(symbol) => {
              // Handle symbol selection for trading
              console.log(`Selected ${symbol} for trading`);
            }}
            limit={10}
          />
        </div>
        
        <div className="space-y-4 sm:space-y-6 min-h-0">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>

      {/* Trade Book Section - handles all trade-related functionality */}
      <TradeBookSection />
    </div>
  );
};

export default Dashboard;