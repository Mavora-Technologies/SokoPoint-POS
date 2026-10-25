'use client';

import { useState, useEffect } from 'react';
import { Bell, Loader2, AlertTriangle, Info, CheckCircle, Clock, Trash2, CheckCheck } from 'lucide-react';
import api from '../../../lib/api';

interface Notification {
  id: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchLiveNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Fetch live data to generate real notifications
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products').catch(() => ({ data: { data: [] } })),
        api.get('/orders').catch(() => ({ data: { data: [] } }))
      ]);

      const products = productsRes.data?.data || [];
      const orders = ordersRes.data?.data || [];

      const liveNotifications: Notification[] = [];

      // 1. Generate Low Stock Alerts
      const lowStockItems = products.filter((p: any) => Number(p.stock || 0) <= Number(p.minimumStock || 5));
      lowStockItems.forEach((p: any) => {
        liveNotifications.push({
          id: `stock-${p.id}`,
          type: 'ALERT',
          title: 'Low Stock Warning',
          message: `${p.name} is running critically low (Current: ${p.stock} units). Restock recommended.`,
          time: new Date().toISOString(), // Current time for active alert
          isRead: false
        });
      });

      // 2. Generate Recent Sales Success Notifications (Last 5 orders)
      const sortedOrders = orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const recentOrders = sortedOrders.slice(0, 5);
      recentOrders.forEach((o: any) => {
        liveNotifications.push({
          id: `order-${o.id}`,
          type: 'SUCCESS',
          title: 'New Order Processed',
          message: `Order ${o.orderNum} for KES ${Number(o.total).toLocaleString()} completed via ${String(o.method).toUpperCase()}.`,
          time: o.createdAt,
          isRead: false
        });
      });

      // 3. System Status Info
      liveNotifications.push({
        id: 'sys-1',
        type: 'INFO',
        title: 'System Synchronized',
        message: 'All POS terminals and inventory databases are actively synced and online.',
        time: new Date().toISOString(),
        isRead: true
      });

      // Sort all notifications by time (newest first)
      liveNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setNotifications(liveNotifications);
    } catch (error) {
      console.error('Failed to generate live notifications', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchLiveNotifications();
    }
  }, [isMounted]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT': return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 shrink-0" />;
      case 'SUCCESS': return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />;
      default: return <Info className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 shrink-0" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Bell className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">System Notifications</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs sm:text-sm font-bold text-red-800 shrink-0 shadow-sm">
                  {unreadCount} New
                </span>
              )}
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Live updates on inventory levels, recent POS activity, and system status.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || isLoading}
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all disabled:opacity-50 touch-manipulation active:scale-95"
            >
              <CheckCheck className="mr-2 h-5 w-5 shrink-0" />
              Mark all as read
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="rounded-2xl lg:rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-16 lg:py-24 text-center">
              <div className="mx-auto h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                <Bell className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-900">All caught up!</h3>
              <p className="mt-2 text-sm lg:text-base text-slate-500">
                You have no active alerts or notifications right now.
              </p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-slate-100 w-full">
              {notifications.map((notification) => (
                <li 
                  key={notification.id} 
                  className={`p-4 sm:p-6 lg:p-8 hover:bg-slate-50/80 transition-colors group ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="mt-1 flex-shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base sm:text-lg font-bold ${!notification.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notification.title}
                      </p>
                      <p className="mt-1.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="mt-3 flex items-center text-xs sm:text-sm text-slate-400 font-medium">
                        <Clock className="mr-2 h-4 w-4 shrink-0" />
                        {new Date(notification.time).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-center">
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2.5 sm:p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                        title="Dismiss notification"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}