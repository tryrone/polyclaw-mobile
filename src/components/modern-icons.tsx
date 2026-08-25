import { createElement, type ComponentType } from 'react';
import {
  ArrowLeft as PArrowLeft, ArrowRight as PArrowRight, ArrowsLeftRight, ArrowUpRight as PArrowUpRight,
  ArrowSquareOut, Bell as PBell, Brain, CaretDown, CaretLeft, CaretRight, ChartBar, Check as PCheck, CheckCircle, CircleDashed as PCircleDashed,
  CircleNotch, ClipboardText, Clock, ClockCounterClockwise, Coins as PCoins, Compass as PCompass, Copy as PCopy,
  Cpu as PCpu, Database as PDatabase, Download as PDownload, Envelope, Eye as PEye, Fingerprint as PFingerprint,
  Funnel, Gift as PGift, House, Info as PInfo, Lightning, Lock as PLock, LockKey, MagicWand, MagnifyingGlass,
  Microscope as PMicroscope, Minus as PMinus, Moon as PMoon, Pause as PPause, PauseCircle as PPauseCircle,
  PencilLine as PPencilLine, PlayCircle as PPlayCircle, PlugsConnected, Plus as PPlus, Pulse, Radio as PRadio,
  Receipt, Robot, Scan, ShareNetwork, ShieldCheck as PShieldCheck, ShieldSlash, ShieldWarning, SignOut,
  SlidersHorizontal as PSlidersHorizontal, Sparkle, Star as PStar, Sun as PSun, Target as PTarget,
  Ticket as PTicket, Trophy as PTrophy, UserCircle, Users as PUsers, Video as PVideo, Wallet, Warning,
  WarningCircle, X as PX, XCircle, type IconProps,
} from 'phosphor-react-native';

type LegacyProps = Omit<IconProps, 'size'> & { size?: number; strokeWidth?: number; fill?: string; accessibilityLabel?: string };
export type LucideIcon = ComponentType<LegacyProps>;

function icon(Component: ComponentType<IconProps>): LucideIcon {
  return function ModernIcon({ strokeWidth, fill, weight, ...props }: LegacyProps) {
    const filled = fill != null && fill !== 'none' && fill !== 'transparent';
    return createElement(Component as ComponentType<Record<string, unknown>>, { ...props, fill, weight: weight ?? (filled ? 'fill' : strokeWidth && strokeWidth >= 2.4 ? 'bold' : 'regular') });
  };
}

export const Activity = icon(Pulse); export const ArrowLeft = icon(PArrowLeft); export const ArrowRight = icon(PArrowRight);
export const ArrowRightLeft = icon(ArrowsLeftRight); export const ArrowUpRight = icon(PArrowUpRight); export const BarChart3 = icon(ChartBar);
export const Bell = icon(PBell); export const Bot = icon(Robot); export const BrainCircuit = icon(Brain); export const Cable = icon(PlugsConnected);
export const Check = icon(PCheck); export const CheckCircle2 = icon(CheckCircle); export const ChevronDown = icon(CaretDown); export const ChevronLeft = icon(CaretLeft);
export const ChevronRight = icon(CaretRight); export const CircleAlert = icon(WarningCircle); export const CircleCheck = icon(CheckCircle); export const CircleDashed = icon(PCircleDashed);
export const CircleX = icon(XCircle); export const ClipboardCheck = icon(ClipboardText); export const ClipboardList = icon(ClipboardText); export const Clock3 = icon(Clock);
export const Coins = icon(PCoins); export const Compass = icon(PCompass); export const Copy = icon(PCopy); export const Cpu = icon(PCpu); export const Database = icon(PDatabase);
export const Download = icon(PDownload); export const ExternalLink = icon(ArrowSquareOut); export const Eye = icon(PEye); export const Filter = icon(Funnel);
export const Fingerprint = icon(PFingerprint); export const Gift = icon(PGift); export const History = icon(ClockCounterClockwise); export const Home = icon(House);
export const Info = icon(PInfo); export const LoaderCircle = icon(CircleNotch); export const Lock = icon(PLock); export const LockKeyhole = icon(LockKey);
export const LogOut = icon(SignOut); export const Mail = icon(Envelope); export const Microscope = icon(PMicroscope); export const Minus = icon(PMinus);
export const Moon = icon(PMoon); export const Pause = icon(PPause); export const PauseCircle = icon(PPauseCircle); export const PencilLine = icon(PPencilLine);
export const PlayCircle = icon(PPlayCircle); export const Plus = icon(PPlus); export const Radio = icon(PRadio); export const ReceiptText = icon(Receipt);
export const ScanSearch = icon(Scan); export const Search = icon(MagnifyingGlass); export const Share2 = icon(ShareNetwork); export const ShieldAlert = icon(ShieldWarning);
export const ShieldCheck = icon(PShieldCheck); export const ShieldX = icon(ShieldSlash); export const SlidersHorizontal = icon(PSlidersHorizontal); export const Sparkles = icon(Sparkle);
export const Star = icon(PStar); export const Sun = icon(PSun); export const Target = icon(PTarget); export const Ticket = icon(PTicket); export const TriangleAlert = icon(Warning);
export const Trophy = icon(PTrophy); export const UserRound = icon(UserCircle); export const Users = icon(PUsers); export const Video = icon(PVideo); export const WalletCards = icon(Wallet);
export const Wand2 = icon(MagicWand); export const X = icon(PX); export const Zap = icon(Lightning);
