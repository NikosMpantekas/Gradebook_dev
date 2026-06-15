import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
  LogOut,
  Plus,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';
import { switchAccount, logoutAllAccounts } from '../features/auth/authSlice';
import {
  getSavedAccounts,
  getActiveAccountKey,
  removeAccount,
  getInactiveAccounts,
} from '../services/accountStore';



/**
 * AccountSwitcher — An inline collapsible menu for switching between saved accounts.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the switcher is open
 * @param {function} props.onClose - Callback to close the switcher
 */
const AccountSwitcher = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state) => state.ui);

  const [switchingTo, setSwitchingTo] = useState(null);

  const savedAccounts = getSavedAccounts();
  const activeKey = getActiveAccountKey();
  const inactiveAccounts = getInactiveAccounts();

  /** Switch to a different saved account. */
  const handleSwitchAccount = useCallback(async (account) => {
    const targetKey = `${account.id}_${account.schoolId ?? 'none'}`;
    if (targetKey === activeKey) return;

    setSwitchingTo(targetKey);
    try {
      const result = await dispatch(
        switchAccount({ id: account.id, schoolId: account.schoolId })
      ).unwrap();

      if (onClose) onClose();

      // Navigate to the appropriate dashboard based on role
      const rolePaths = {
        superadmin: '/superadmin/dashboard',
        admin: '/app/admin',
        teacher: '/app/teacher',
        student: '/app/student',
        parent: '/app/parent',
      };
      const targetPath = rolePaths[result.role] || '/app/dashboard';
      const cacheBuster = Date.now();
      window.location.replace(`${targetPath}?v=${cacheBuster}`);
    } catch (err) {
      toast.error(err || 'Failed to switch account. Please log in again.');
      setSwitchingTo(null);
    }
  }, [activeKey, dispatch, onClose]);

  /** Remove a specific account from saved accounts. */
  const handleRemoveAccount = useCallback((e, account) => {
    e.stopPropagation();
    removeAccount(account.id, account.schoolId);

    // If the removed account was the active one, the authSlice logout
    // handles redirection. For inactive accounts, just re-render.
    if (`${account.id}_${account.schoolId ?? 'none'}` === activeKey) {
      dispatch(logoutAllAccounts());
    }
  }, [activeKey, dispatch]);

  /** Navigate to login to add a new account. */
  const handleAddAccount = useCallback(() => {
    if (onClose) onClose();
    navigate('/login?addAccount=true');
  }, [navigate, onClose]);



  const renderAccountItem = (account, isActive = false) => {
    const key = `${account.id}_${account.schoolId ?? 'none'}`;
    const isSwitching = switchingTo === key;

    return (
      <button
        key={key}
        onClick={() => !isActive && handleSwitchAccount(account)}
        disabled={isActive || isSwitching}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-150',
          isActive
            ? 'bg-primary/10 cursor-default'
            : 'hover:bg-primary/5 cursor-pointer',
          isSwitching && 'opacity-60 pointer-events-none'
        )}
      >
        <Avatar className="h-8 w-8 shrink-0 bg-muted">
          <AvatarFallback className="text-xs font-semibold bg-muted-foreground/10 text-foreground">
            {account.avatarInitials || account.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-medium truncate text-foreground">
              {account.name}
            </span>
            {isActive && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {account.schoolName || t(`sidebar.${account.role}`, account.role)}
          </span>
        </div>

        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : !isActive ? (
          <button
            onClick={(e) => handleRemoveAccount(e, account)}
            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 cursor-pointer"
            aria-label={`Remove ${account.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </button>
    );
  };

  // Find the active account in saved accounts
  const activeAccount = savedAccounts.find(
    (a) => `${a.id}_${a.schoolId ?? 'none'}` === activeKey
  );

  return (
    <div
      className={cn(
        "grid transition-all duration-200 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
      )}
    >
      <div className="overflow-hidden space-y-2 px-1">
        
        {/* Render inactive accounts if any */}
        <div className="space-y-1">
          {inactiveAccounts.map((account) => (
            <div key={`${account.id}_${account.schoolId ?? 'none'}`} className="group">
              {renderAccountItem(account)}
            </div>
          ))}
        </div>

        {inactiveAccounts.length > 0 && (
          <div className="px-2">
            <div className={cn('h-px', darkMode ? 'bg-zinc-800' : 'bg-slate-200')} />
          </div>
        )}

        {/* Actions footer */}
        <div className="space-y-1 pb-1">
          {/* Add Account */}
          <button
            onClick={handleAddAccount}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
              'hover:bg-primary/5 text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="h-8 w-8 rounded-full border border-dashed flex items-center justify-center shrink-0 border-muted-foreground/40 bg-transparent">
              <Plus className="h-4 w-4" />
            </div>
            <span className="font-medium">{t('sidebar.addAccount', 'Add account')}</span>
          </button>


        </div>
      </div>
    </div>
  );
};

export default AccountSwitcher;
