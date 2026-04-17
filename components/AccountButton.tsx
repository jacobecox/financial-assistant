"use client";

import { UserButton } from "@clerk/nextjs";

function HouseholdIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
      <path d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3H9v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
      <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h16.5a.75.75 0 0 1 0 1.5H18v8.75A2.75 2.75 0 0 1 15.25 15h-1.072l.798 3.06a.75.75 0 0 1-1.452.38L13.131 17H6.87l-.393 1.44a.75.75 0 0 1-1.452-.38L5.822 15H4.75A2.75 2.75 0 0 1 2 12.25V3.5h-.25A.75.75 0 0 1 1 2.75ZM7.373 15l-.391 1.5h6.036L12.627 15H7.373ZM3.5 3.5v8.75c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V3.5h-13Z" clipRule="evenodd" />
    </svg>
  );
}

export function AccountButton() {
  return (
    <UserButton afterSignOutUrl="/">
      <UserButton.MenuItems>
        <UserButton.Link
          label="Linked Accounts"
          labelIcon={<BankIcon />}
          href="/settings/accounts"
        />
        <UserButton.Link
          label="Household"
          labelIcon={<HouseholdIcon />}
          href="/settings/household"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
