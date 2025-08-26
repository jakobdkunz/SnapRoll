"use client";
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { 
  HiOutlineHandRaised,
  HiOutlineHandThumbUp,
  HiOutlineHandThumbDown,
  HiOutlineHand,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineIdentification,
  HiOutlineClipboardDocument,
  HiOutlineCheckCircle,
  HiOutlineCheckBadge,
  HiOutlineFingerPrint,
  HiOutlineKey,
  HiOutlineQrCode,
  HiOutlineTicket,
  HiOutlineDocumentText,
  HiOutlineDocumentCheck,
  HiOutlineClipboard,
  HiOutlineClipboardCheck
} from 'react-icons/hi2';

const iconOptions = [
  { name: 'HiOutlineHandRaised', icon: HiOutlineHandRaised, description: 'Raised hand (waving)' },
  { name: 'HiOutlineHandThumbUp', icon: HiOutlineHandThumbUp, description: 'Thumbs up' },
  { name: 'HiOutlineHandThumbDown', icon: HiOutlineHandThumbDown, description: 'Thumbs down' },
  { name: 'HiOutlineHand', icon: HiOutlineHand, description: 'Open hand' },
  { name: 'HiOutlineUser', icon: HiOutlineUser, description: 'Single person' },
  { name: 'HiOutlineUserGroup', icon: HiOutlineUserGroup, description: 'Group of people' },
  { name: 'HiOutlineIdentification', icon: HiOutlineIdentification, description: 'ID card' },
  { name: 'HiOutlineClipboardDocument', icon: HiOutlineClipboardDocument, description: 'Clipboard with document' },
  { name: 'HiOutlineCheckCircle', icon: HiOutlineCheckCircle, description: 'Check in circle' },
  { name: 'HiOutlineCheckBadge', icon: HiOutlineCheckBadge, description: 'Check badge' },
  { name: 'HiOutlineFingerPrint', icon: HiOutlineFingerPrint, description: 'Fingerprint' },
  { name: 'HiOutlineKey', icon: HiOutlineKey, description: 'Key' },
  { name: 'HiOutlineQrCode', icon: HiOutlineQrCode, description: 'QR code' },
  { name: 'HiOutlineTicket', icon: HiOutlineTicket, description: 'Ticket' },
  { name: 'HiOutlineDocumentText', icon: HiOutlineDocumentText, description: 'Document with text' },
  { name: 'HiOutlineDocumentCheck', icon: HiOutlineDocumentCheck, description: 'Document with check' },
  { name: 'HiOutlineClipboardCheck', icon: HiOutlineClipboardCheck, description: 'Clipboard with checkmark' },
  { name: 'HiOutlineClipboard', icon: HiOutlineClipboard, description: 'Simple clipboard' }
];

export default function IconOptionsPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/sections')}>← Back to Sections</Button>
        <div className="font-medium">Icon Options for Attendance Code</div>
      </div>
      
      <Card className="p-6">
        <div className="text-sm text-slate-600 mb-4">
          Click on any icon to see how it would look. Tell me which one you prefer!
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {iconOptions.map((option) => (
            <div 
              key={option.name}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => {
                // For now, just show an alert with the icon name
                alert(`You selected: ${option.name}\n\nTell me this name and I'll update the check-in page!`);
              }}
            >
              <option.icon className="w-8 h-8 text-slate-600 mb-2" />
              <div className="text-xs font-medium text-center text-slate-700">{option.name}</div>
              <div className="text-xs text-center text-slate-500 mt-1">{option.description}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
