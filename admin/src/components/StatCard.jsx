import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

function StatCard({ title, value, icon: Icon, trend, trendValue, color = 'rebeca' }) {
  const colorClasses = {
    rebeca: {
      bg: 'bg-rebeca-500/10',
      border: 'border-rebeca-500/20',
      icon: 'text-rebeca-500',
      trend: 'text-rebeca-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-500',
      trend: 'text-blue-400',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: 'text-yellow-500',
      trend: 'text-yellow-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      icon: 'text-purple-500',
      trend: 'text-purple-400',
    },
  }

  const colors = colorClasses[color]

  return (
    <div className="glass-card rounded-2xl p-6 hover:border-dark-600 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
          <Icon size={24} className={colors.icon} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <h3 className="text-dark-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-display font-bold text-white">{value}</p>
    </div>
  )
}

export default StatCard
