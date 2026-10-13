/*
 * Ikony liniowe w jednym rysunku (24 × 24, kreska 2), jak w szablonie: pióro, tarcza
 * i zębatki przy trzech kolumnach, drobne ikony przy funkcjach i przyciskach.
 * Rysowane tutaj, bez biblioteki - strona potrzebuje kilkunastu.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            {...props}
        >
            {children}
        </svg>
    );
}

/** Pełne, ciężkie ikony trzech kolumn - w szablonie są wypełnione, nie liniowe. */
export function FeatherIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
            <path d="M20.2 3.8c-3.9-1.3-9.4.4-12.6 3.6-2.6 2.6-3.4 6.2-3 9.1L2.3 18.8a1 1 0 1 0 1.4 1.4l2.3-2.3c2.9.4 6.5-.4 9.1-3 .7-.7 1.3-1.5 1.8-2.3h-4.4l2-2h3.3c.3-.8.6-1.6.8-2.4h-2.6l2-2h1c.4-1.3.4-2.5 0-3.6Z" />
        </svg>
    );
}

export function ShieldIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
            <path d="M12 1.8 3.5 5.1v6.1c0 5.3 3.6 9.6 8.5 11 4.9-1.4 8.5-5.7 8.5-11V5.1L12 1.8Zm0 2.3 6.4 2.5v4.6c0 4.1-2.6 7.6-6.4 8.9V4.1Z" />
        </svg>
    );
}

export function GearsIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
            <path d="M9.4 6.2h1.9l.4 1.6c.5.2 1 .4 1.4.8l1.6-.5 1 1.6-1.2 1.2c.1.5.1 1 0 1.5l1.2 1.2-1 1.6-1.6-.5c-.4.3-.9.6-1.4.8l-.4 1.6H9.4L9 15.5c-.5-.2-1-.5-1.4-.8l-1.6.5-1-1.6 1.2-1.2a3.8 3.8 0 0 1 0-1.5L5 9.7l1-1.6 1.6.5c.4-.4.9-.6 1.4-.8l.4-1.6Zm.9 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z" />
            <path d="M17.6 1.5h1.2l.3 1c.3.1.6.3.9.5l1-.3.6 1-.8.8v1l.8.7-.6 1-1-.3c-.3.2-.6.4-.9.5l-.3 1h-1.2l-.3-1c-.3-.1-.6-.3-.9-.5l-1 .3-.6-1 .8-.7v-1l-.8-.8.6-1 1 .3c.3-.2.6-.4.9-.5l.3-1Zm.6 2.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z" />
            <path d="M17.6 15.1h1.2l.3 1c.3.1.6.3.9.5l1-.3.6 1-.8.8v1l.8.7-.6 1-1-.3c-.3.2-.6.4-.9.5l-.3 1h-1.2l-.3-1c-.3-.1-.6-.3-.9-.5l-1 .3-.6-1 .8-.7v-1l-.8-.8.6-1 1 .3c.3-.2.6-.4.9-.5l.3-1Zm.6 2.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z" />
        </svg>
    );
}

export function PowerIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 3v8" />
            <path d="M6.3 6.6a8 8 0 1 0 11.4 0" />
        </Icon>
    );
}

export function DotsIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
            <circle cx="5" cy="12" r="2.2" />
            <circle cx="12" cy="12" r="2.2" />
            <circle cx="19" cy="12" r="2.2" />
        </svg>
    );
}

export function UserIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </Icon>
    );
}

export function MenuIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M4 7h16M4 12h16M4 17h16" />
        </Icon>
    );
}

export function CloseIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M6 6l12 12M18 6 6 18" />
        </Icon>
    );
}

export function CheckIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
        </Icon>
    );
}

export function InboxIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M3 13h5l1.5 3h5L16 13h5" />
            <path d="M5.5 5h13L21 13v6H3v-6l2.5-8Z" />
        </Icon>
    );
}

export function BellIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
            <path d="M10 20a2 2 0 0 0 4 0" />
        </Icon>
    );
}

export function CameraIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M3 8h3.5L8 5.5h8L17.5 8H21v11H3V8Z" />
            <circle cx="12" cy="13.5" r="3.5" />
        </Icon>
    );
}

export function MessageIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M4 5h16v11H9l-5 4V5Z" />
            <path d="m9 10.5 2 2 4-4" />
        </Icon>
    );
}

export function ReceiptIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
            <path d="M9 8h6M9 12h6" />
        </Icon>
    );
}

export function ClockIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </Icon>
    );
}

export function LaptopIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="4" y="5" width="16" height="11" rx="1.5" />
            <path d="M2 19h20" />
        </Icon>
    );
}

export function TabletIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M11.5 16h1" />
        </Icon>
    );
}

export function PhoneIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="7" y="2.5" width="10" height="19" rx="2" />
            <path d="M11 18h2" />
        </Icon>
    );
}
