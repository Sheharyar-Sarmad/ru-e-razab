// components/admin/navigation/AdminSidebar.tsx
"use client";

import { useState, useEffect, ReactNode, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import gsap from "gsap";
import axios from "axios";
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  SparklesIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  TrophyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  PlusCircleIcon, // Added
  MagnifyingGlassIcon, // Added
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  SparklesIcon as SparklesIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  GlobeAltIcon as GlobeAltIconSolid
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { Brain } from "lucide-react"

let Logo: any;
try {
  Logo = require("@/public/logo.png").default;
} catch {
  Logo = null;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  iconSolid: React.ReactNode;
  children?: NavItem[];
}

interface AdminSidebarProps {
  children?: ReactNode;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  defaultCollapsed?: boolean;
}

interface AdminData {
  _id: string;
  accountname: string;
  email: string;
  firstname: string;
  lastname: string;
  phonenumber: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: AdminData | null;
  err: string | null;
  status: number;
}

const COLORS = {
  warmWhite: "#FFF3EF",
  deepForest: "#2B4735",
  burntRust: "#BD4D23",
  richMustard: "#BF7303",
  softAmethyst: "#A964FF",
  tataBlue: "#4786C4",
  pinkRed: "#E13C67",
  purple: "#9E4688",
  orange: "#D74931",
  emeraldGreen: "#9F3F1C",
  royalBlue: "#4169E1",
  coral: "#FF7F50",
  lightEmerald: "#B85C35",
  darkEmerald: "#7A2F15",
  hamburgerColor: "#9F3F1C",
};

const NAV_COLORS = [
  COLORS.softAmethyst,
  COLORS.emeraldGreen,
  COLORS.tataBlue,
  COLORS.orange,
  COLORS.purple,
  COLORS.coral,
];

export default function AdminSidebar({
  children,
  userName: propUserName,
  userEmail: propUserEmail,
  userAvatar,
  defaultCollapsed = false,
}: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // --- CUSTOM LINKS STATE (No DB) ---
  const [customLinks, setCustomLinks] = useState<{ label: string; href: string }[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkHref, setNewLinkHref] = useState('');
  const [linkSearch, setLinkSearch] = useState('');

  const sidebarRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const userInfoRef = useRef<HTMLDivElement>(null);

  // Load/Save Custom Links from LocalStorage
  useEffect(() => {
    const savedLinks = localStorage.getItem('customAdminLinks');
    if (savedLinks) {
      try {
        setCustomLinks(JSON.parse(savedLinks));
      } catch (e) {
        console.error("Failed to parse custom links", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('customAdminLinks', JSON.stringify(customLinks));
  }, [customLinks]);

  const handleAddLink = () => {
    if (newLinkLabel.trim() && newLinkHref.trim()) {
      setCustomLinks([...customLinks, { label: newLinkLabel.trim(), href: newLinkHref.trim() }]);
      setNewLinkLabel('');
      setNewLinkHref('');
      setShowAddLink(false);
    }
  };

  const handleRemoveLink = (hrefToRemove: string) => {
    setCustomLinks(customLinks.filter(link => link.href !== hrefToRemove));
  };

  const filteredLinks = customLinks.filter(link => 
    link.label.toLowerCase().includes(linkSearch.toLowerCase()) || 
    link.href.toLowerCase().includes(linkSearch.toLowerCase())
  );

  // Responsive detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
      
      if (mobile) {
        setIsCollapsed(false);
        setIsOpen(false);
      } else if (tablet) {
        const saved = localStorage.getItem("sidebarCollapsed");
        if (saved !== null) {
          setIsCollapsed(JSON.parse(saved));
        } else {
          setIsCollapsed(true);
        }
        setIsOpen(false);
      } else {
        const saved = localStorage.getItem("sidebarCollapsed");
        if (saved !== null) {
          setIsCollapsed(JSON.parse(saved));
        }
        setIsOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await axios.get<ApiResponse>(
          "/api/admin/dashboard/details/account",
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.success && response.data.data) {
          setAdminData(response.data.data);
          setAuthError(null);
        } else {
          setAuthError(response.data.message || "Failed to load admin data");
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          setAuthError("Session expired. Please login again.");
          setTimeout(() => {
            router.push("/admin/login");
          }, 2000);
        } else {
          setAuthError("Failed to load admin data. Please refresh.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [router]);

  const userName =
    adminData?.firstname && adminData?.lastname
      ? `${adminData.firstname} ${adminData.lastname}`
      : adminData?.accountname || propUserName || "Admin";

  const userEmail = adminData?.email || propUserEmail || "admin@example.com";

  const getUserInitials = () => {
    if (adminData?.firstname && adminData?.lastname) {
      return `${adminData.firstname[0]}${adminData.lastname[0]}`.toUpperCase();
    }
    if (adminData?.accountname) {
      return adminData.accountname[0].toUpperCase();
    }
    return "A";
  };

  // Animations
  useEffect(() => {
    if (sidebarRef.current && !isMobile) {
      gsap.from(sidebarRef.current, {
        opacity: 0,
        x: -30,
        duration: 0.6,
        ease: "power2.out",
      });
    }

    if (logoRef.current) {
      gsap.from(logoRef.current, {
        scale: 0.9,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.7)",
        delay: 0.1,
      });
    }

    navItemsRef.current.forEach((item, index) => {
      if (item) {
        gsap.from(item, {
          opacity: 0,
          x: -15,
          duration: 0.4,
          delay: 0.2 + index * 0.05,
          ease: "power2.out",
        });
      }
    });

    if (userInfoRef.current) {
      gsap.from(userInfoRef.current, {
        opacity: 0,
        y: 15,
        duration: 0.4,
        delay: 0.5,
        ease: "power2.out",
      });
    }

    return () => {
      gsap.killTweensOf(sidebarRef.current);
      gsap.killTweensOf(logoRef.current);
      gsap.killTweensOf(userInfoRef.current);
    };
  }, [isMobile]);

  // Time update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile || isTablet) {
      setIsOpen(false);
    }
  }, [pathname, isMobile, isTablet]);

  // Persist collapse state
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  // Body scroll lock for mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = isOpen ? "hidden" : "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  // Touch swipe handling for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;

      if (diff > 50 && isOpen) {
        setIsOpen(false);
      }
      if (diff < -50 && !isOpen && touchStartX < 50) {
        setIsOpen(true);
      }
      setTouchStartX(null);
    };

    if (isMobile) {
      document.addEventListener("touchstart", handleTouchStart);
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, isOpen, touchStartX]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      const response = await axios.post(
        "/api/admin/auth/logout",
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (error: any) {
      if (error.response) {
        setLogoutError(error.response.data?.message || "Logout failed");
      } else {
        setLogoutError("Network error. Check your connection.");
      }
      setTimeout(() => {
        setLogoutError(null);
      }, 5000);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navigationItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <HomeIcon className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <HomeIconSolid className="w-5 h-5 flex-shrink-0" />,
    },
    {
      label: "View Site",
      href: "/",
      icon: <GlobeAltIcon className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <GlobeAltIconSolid  className="w-5 h-5 flex-shrink-0" />,
    },
    {
      label: "Jadeed Kalam",
      href: "/admin/dashboard/jadeed-kalam",
      icon: <SparklesIcon className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <SparklesIconSolid className="w-5 h-5 flex-shrink-0" />,
    },
    {
      label: "Kalam",
      icon: <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />,
      children: [
        {
          label: "Ghazals",
          href: "/admin/dashboard/kalam/ghazals",
          icon: <SparklesIcon className="w-5 h-5 flex-shrink-0" />,
          iconSolid: <SparklesIconSolid className="w-5 h-5 flex-shrink-0" />,
        },
        {
          label: "Nazms",
          href: "/admin/dashboard/kalam/nazms",
          icon: <BookOpenIcon className="w-5 h-5 flex-shrink-0" />,
          iconSolid: <BookOpenIconSolid className="w-5 h-5 flex-shrink-0" />,
        },
        {
          label: "Qatas",
          href: "/admin/dashboard/kalam/qatas",
          icon: <PencilSquareIcon className="w-5 h-5 flex-shrink-0" />,
          iconSolid: <PencilSquareIcon className="w-5 h-5 flex-shrink-0" />,
        },
        {
          label: "Shairs",
          href: "/admin/dashboard/kalam/shairs",
          icon: <MusicalNoteIcon className="w-5 h-5 flex-shrink-0" />,
          iconSolid: <MusicalNoteIcon className="w-5 h-5 flex-shrink-0" />,
        },
      ],
    },
    {
      label: "AI Chat",
      href: "/admin/dashboard/ai-chat",
      icon: <Brain className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <Brain strokeWidth={3} className="w-5 h-5 flex-shrink-0" />,
    },
    {
      label: "Users",
      href: "/admin/dashboard/view/users",
      icon: <UserGroupIcon className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <UserGroupIconSolid className="w-5 h-5 flex-shrink-0" />,
    },
    {
      label: "Settings",
      href: "/admin/dashboard/account/settings",
      icon: <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />,
      iconSolid: <Cog6ToothIconSolid className="w-5 h-5 flex-shrink-0" />,
    },
  ];

  const toggleMenu = (label: string) => {
    setExpandedMenu((prev) => (prev === label ? null : label));
  };

  const renderNavItem = (item: NavItem, index: number, isChild = false) => {
    const isItemActive = item.href ? isActive(item.href) : false;
    const isParentActive = item.children?.some((child) => child.href && isActive(child.href));
    const isHovered = hoveredItem === item.label;
    const colorIndex = index % NAV_COLORS.length;
    const itemColor = NAV_COLORS[colorIndex];
    const textColor = isItemActive || isHovered || isParentActive ? itemColor : COLORS.deepForest;

    // If it's a dropdown parent
    if (item.children) {
      return (
        <motion.div
          key={item.label}
          ref={(el) => {
            navItemsRef.current[index] = el;
          }}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="relative"
          onMouseEnter={() => setHoveredItem(item.label)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            onClick={() => !isCollapsed && toggleMenu(item.label)}
            title={isCollapsed ? item.label : undefined}
            className={`
              nav-link
              group relative flex items-center px-2 sm:px-3 md:px-4 py-2.5 rounded-lg
              transition-all duration-300 ease-in-out
              ${isParentActive ? "shadow-md" : "hover:shadow-md"}
              ${isCollapsed ? "justify-center" : ""}
              text-sm sm:text-base
              touch-manipulation w-full
            `}
            style={
              {
                background: isParentActive
                  ? `linear-gradient(135deg, ${itemColor}25, ${itemColor}10)`
                  : isHovered
                  ? `linear-gradient(135deg, ${itemColor}15, ${itemColor}05)`
                  : "transparent",
                border: isHovered ? `1px solid ${itemColor}30` : "1px solid transparent",
                transform: isHovered ? "scale(1.02)" : "scale(1)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                ["--nav-color" as any]: textColor,
              } as React.CSSProperties
            }
          >
            <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
              <span className="transition-all duration-300 ease-in-out flex-shrink-0">
                {isParentActive ? item.iconSolid : item.icon}
              </span>
              {!isCollapsed && (
                <span className="nav-label font-medium text-sm truncate">{item.label}</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="ml-auto">
                {expandedMenu === item.label ? (
                  <ChevronUpIcon className="w-4 h-4" style={{ color: textColor }} />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" style={{ color: textColor }} />
                )}
              </span>
            )}
          </button>

          {/* Submenu */}
          {!isCollapsed && item.children && (
            <motion.div
              initial={false}
              animate={{
                height: expandedMenu === item.label ? "auto" : 0,
                opacity: expandedMenu === item.label ? 1 : 0,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden pl-4 sm:pl-6"
            >
              <div className="space-y-1 pt-1 pb-2">
                {item.children.map((child, childIdx) => renderNavItem(child, index + childIdx + 1, true))}
              </div>
            </motion.div>
          )}
        </motion.div>
      );
    }

    // Standard Link (same exact rendering as original)
    return (
      <motion.div
        key={item.label}
        ref={(el) => {
          navItemsRef.current[index] = el;
        }}
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="relative"
        onMouseEnter={() => setHoveredItem(item.label)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Link
          href={item.href || "#"}
          title={isCollapsed ? item.label : undefined}
          className={`
            nav-link
            group relative flex items-center px-2 sm:px-3 md:px-4 py-2.5 rounded-lg
            transition-all duration-300 ease-in-out
            ${isItemActive ? "shadow-md" : "hover:shadow-md"}
            ${isCollapsed ? "justify-center" : ""}
            text-sm sm:text-base
            touch-manipulation
          `}
          style={
            {
              background: isItemActive
                ? `linear-gradient(135deg, ${itemColor}25, ${itemColor}10)`
                : isHovered
                ? `linear-gradient(135deg, ${itemColor}15, ${itemColor}05)`
                : "transparent",
              border: isHovered ? `1px solid ${itemColor}30` : "1px solid transparent",
              transform: isHovered ? "scale(1.02)" : "scale(1)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              ["--nav-color" as any]: textColor,
            } as React.CSSProperties
          }
        >
          <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
            <span className="transition-all duration-300 ease-in-out flex-shrink-0">
              {isItemActive ? item.iconSolid : item.icon}
            </span>
            {!isCollapsed && (
              <span className="nav-label font-medium text-sm truncate">{item.label}</span>
            )}
          </div>
          {isItemActive && !isCollapsed && (
            <div
              className="absolute right-2 w-1 h-6 rounded-full"
              style={{
                background: `linear-gradient(180deg, ${itemColor}, ${itemColor}CC)`,
                boxShadow: `0 0 12px ${itemColor}60`,
              }}
            />
          )}
        </Link>
      </motion.div>
    );
  };

  // Responsive width classes
  const getSidebarWidth = () => {
    if (isCollapsed) {
      if (isMobile) return "w-16";
      return "w-20";
    }
    if (isMobile) return "w-[280px] max-w-[85vw]";
    if (isTablet) return "w-[240px]";
    return "w-[240px] sm:w-[260px] lg:w-[280px]";
  };

  const sidebarWidth = getSidebarWidth();

  // Determine if sidebar should be shown as overlay
  const isOverlay = isMobile || isTablet;

  return (
    <>
      <style>{`
        @keyframes emerald-shift {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 50%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 0% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .admin-sidebar, .admin-sidebar * {
          opacity: 1 !important;
        }
        .admin-sidebar .nav-link {
          color: var(--nav-color) !important;
        }
        .admin-sidebar .nav-link svg {
          color: var(--nav-color) !important;
          stroke: currentColor !important;
        }
        .admin-sidebar .nav-label {
          color: var(--nav-color) !important;
        }
        .admin-sidebar .user-name,
        .admin-sidebar .user-email,
        .admin-sidebar .user-phone {
          color: var(--text-color) !important;
        }

        .admin-sidebar {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-overlay {
          transition: opacity 0.3s ease;
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .admin-sidebar .nav-link:hover {
            transform: none !important;
          }
          .admin-sidebar .nav-link:active {
            transform: scale(0.95) !important;
          }
        }

        /* Mobile & Tablet styles */
        @media (max-width: 1023px) {
          .admin-sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            height: 100vh !important;
            z-index: 99998 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            overflow-y: auto !important;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-sidebar.mobile-closed {
            transform: translateX(-100%) !important;
          }
          
          /* Add padding to the entire sidebar content to avoid hamburger */
          .admin-sidebar .sidebar-inner {
            padding-top: 70px !important;
          }
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          .admin-sidebar {
            transform: translateX(0) !important;
            position: sticky !important;
            top: 0 !important;
            display: flex !important;
            height: 100vh !important;
            z-index: auto !important;
            overflow-y: auto !important;
          }
        }

        /* Hide scrollbar but keep functionality */
        .admin-sidebar::-webkit-scrollbar {
          width: 3px;
        }
        .admin-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-sidebar::-webkit-scrollbar-thumb {
          background: ${COLORS.emeraldGreen}40;
          border-radius: 10px;
        }
        .admin-sidebar::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.emeraldGreen}60;
        }

        /* Hamburger button always on top, with glassmorphism */
        .hamburger-btn {
          z-index: 99999 !important;
          -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
        }
        .hamburger-btn:hover {
          transform: translateY(-1px);
        }
        .hamburger-btn:active {
          transform: translateY(0) scale(0.95);
        }

        /* Ensure content doesn't overflow */
        .admin-sidebar .sidebar-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
      `}</style>

      {/* Mobile/Tablet Toggle Button */}
      {isOverlay && (
        <button
          onClick={toggleSidebar}
          className="hamburger-btn fixed top-4 sm:top-5 left-4 sm:left-5 p-2.5 sm:p-3 rounded-2xl text-white transition-all duration-300 touch-manipulation"
          style={{
            background: `linear-gradient(135deg, ${COLORS.hamburgerColor}B3, ${COLORS.burntRust}B3)`,
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
          aria-label="Toggle sidebar"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
          ) : (
            <Bars3Icon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
          )}
        </button>
      )}

      {/* Overlay for mobile/tablet */}
      {isOpen && isOverlay && (
        <div
          className="sidebar-overlay fixed inset-0 bg-black/40 md:bg-black/30 backdrop-blur-sm"
          onClick={toggleSidebar}
          aria-hidden="true"
          style={{ zIndex: 99997 }}
        />
      )}

      {/* Collapse Toggle Button (Desktop only) */}
      {!isOverlay && (
        <button
          onClick={toggleCollapse}
          className="fixed z-50 hidden lg:flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full shadow-lg border transition-all duration-300 hover:scale-110 hover:shadow-xl touch-manipulation"
          style={{
            background: `linear-gradient(135deg, ${COLORS.emeraldGreen}, ${COLORS.darkEmerald})`,
            borderColor: `${COLORS.emeraldGreen}40`,
            color: "white",
            top: "50%",
            left: isCollapsed ? "calc(5rem - 4px)" : "calc(280px - 4px)",
            transform: "translateY(-50%)",
          }}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          ) : (
            <ChevronLeftIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          )}
        </button>
      )}

      <aside
        ref={sidebarRef}
        className={`
          admin-sidebar
          min-h-screen h-full ${sidebarWidth}
          border-r shadow-xl flex flex-col flex-shrink-0
          transition-all duration-300 ease-in-out
          ${isOverlay ? (isOpen ? "mobile-open" : "mobile-closed") : ""}
        `}
        style={
          {
            background: `linear-gradient(135deg, ${COLORS.warmWhite}, ${COLORS.lightEmerald}15, ${COLORS.warmWhite})`,
            backgroundSize: "200% 200%",
            animation: "emerald-shift 8s ease-in-out infinite",
            borderColor: `${COLORS.emeraldGreen}30`,
            ["--text-color" as any]: COLORS.deepForest,
          } as React.CSSProperties
        }
      >
        {/* Inner container with padding for mobile */}
        <div className="sidebar-inner">
          {/* Logo Section */}
          <div
            ref={logoRef}
            className="px-3 sm:px-4 py-4 sm:py-5 border-b flex-shrink-0 transition-all duration-300"
            style={{ 
              borderColor: `${COLORS.emeraldGreen}20`,
            }}
          >
            <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${isCollapsed ? "scale-90" : ""}`}>
              <div className={`relative flex-shrink-0 transition-all duration-300 ${
                isCollapsed ? "w-10 h-10 sm:w-12 sm:h-12" : "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20"
              }`}>
                {Logo ? (
                  <Image
                    src={Logo}
                    alt="Logo"
                    fill
                    sizes={isCollapsed ? "64px" : "120px"}
                    className="object-contain"
                    priority
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                    R
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="text-center w-full">
                  <h1
                    className="text-base sm:text-lg md:text-xl font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.darkEmerald}, ${COLORS.emeraldGreen}, ${COLORS.lightEmerald})`,
                      backgroundSize: "200% 200%",
                      animation: "gradient-shift 4s ease-in-out infinite",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Admin Panel
                  </h1>
                  <p
                    className="text-[10px] sm:text-xs flex items-center justify-center gap-1 mt-0.5"
                    style={{ color: `${COLORS.deepForest}CC` }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: COLORS.emeraldGreen, animation: "pulse 2s ease-in-out infinite" }}
                    />
                    Ru-e-Razab
                  </p>
                  <div
                    className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-mono px-2 py-0.5 sm:py-1 rounded-lg inline-block"
                    style={{
                      background: `${COLORS.emeraldGreen}10`,
                      color: COLORS.deepForest,
                      border: `1px solid ${COLORS.emeraldGreen}20`,
                    }}
                  >
                    {time}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Children Slot */}
          {children && !isCollapsed && (
            <div
              className="px-2 sm:px-3 py-2 sm:py-3 border-b flex-shrink-0 transition-all duration-300"
              style={{ borderColor: `${COLORS.emeraldGreen}20` }}
            >
              {children}
            </div>
          )}

          {/* Navigation */}
          <nav
            className={`flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 pt-6 sm:pt-8 pb-3 sm:pb-4 space-y-1 transition-all duration-300 ${
              isCollapsed ? "px-1.5 sm:px-2" : ""
            }`}
          >
            {navigationItems.map((item, index) => renderNavItem(item, index))}

            {/* --- CUSTOM LINKS SECTION (No DB) --- */}
            {!isCollapsed && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: `${COLORS.emeraldGreen}20` }}>
                <div className="px-2 sm:px-3 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Links</span>
                    <button
                      onClick={() => setShowAddLink(!showAddLink)}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {showAddLink ? <XMarkIcon className="w-4 h-4" /> : <PlusCircleIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Add Form */}
                {showAddLink && (
                  <div className="px-2 sm:px-3 mb-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Label (e.g., My Tool)"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="URL (e.g., https://example.com)"
                      value={newLinkHref}
                      onChange={(e) => setNewLinkHref(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      onClick={handleAddLink}
                      disabled={!newLinkLabel.trim() || !newLinkHref.trim()}
                      className="w-full py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.tataBlue}, ${COLORS.softAmethyst})`
                      }}
                    >
                      Add Link
                    </button>
                  </div>
                )}

                {/* Search */}
                {customLinks.length > 0 && (
                  <div className="px-2 sm:px-3 mb-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search links..."
                        value={linkSearch}
                        onChange={(e) => setLinkSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Links List */}
                <div className="space-y-0.5 px-1">
                  {filteredLinks.length > 0 ? (
                    filteredLinks.map((link, idx) => (
                      <div key={idx} className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <Link
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-gray-700 truncate hover:text-emerald-700 transition-colors"
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => handleRemoveLink(link.href)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-100 text-red-500 transition-all"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    customLinks.length > 0 && linkSearch && (
                      <p className="text-xs text-gray-400 text-center py-2">No results found</p>
                    )
                  )}
                </div>
              </div>
            )}
            {/* --- END CUSTOM LINKS SECTION --- */}

          </nav>

          {/* Footer Section */}
          <div
            className="border-t p-2 sm:p-3 space-y-2 sm:space-y-3 flex-shrink-0 transition-all duration-300"
            style={{ borderColor: `${COLORS.emeraldGreen}20` }}
          >
            {/* Error Messages */}
            {authError && !isCollapsed && (
              <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm border bg-red-50 border-red-200 text-red-700">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-red-500" />
                <span className="min-w-0 truncate">{authError}</span>
              </div>
            )}

            {logoutError && !isCollapsed && (
              <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm border bg-red-50 border-red-200 text-red-700">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-red-500" />
                <span className="min-w-0 truncate">{logoutError}</span>
              </div>
            )}

            {/* User Info */}
            <div ref={userInfoRef} className="relative group">
              <div
                className={`relative flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                  isCollapsed ? "justify-center px-1.5 sm:px-2" : ""
                }`}
                style={{
                  background: `${COLORS.emeraldGreen}08`,
                  borderColor: `${COLORS.emeraldGreen}20`,
                }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`rounded-full text-white flex items-center justify-center transition-all duration-300 ${
                      isCollapsed ? "p-1.5 sm:p-2" : "p-2"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${COLORS.emeraldGreen}, ${COLORS.darkEmerald})` }}
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className={`rounded-full object-cover ${
                        isCollapsed ? "w-6 h-6 sm:w-8 sm:h-8" : "w-7 h-7 sm:w-8 sm:h-8"
                      }`} />
                    ) : adminData?.firstname && adminData?.lastname ? (
                      <span className={`flex items-center justify-center font-bold ${
                        isCollapsed ? "w-6 h-6 text-xs" : "w-7 h-7 sm:w-8 sm:h-8 text-sm"
                      }`}>
                        {getUserInitials()}
                      </span>
                    ) : (
                      <UserCircleIcon className={`${isCollapsed ? "w-5 h-5 sm:w-6 sm:h-6" : "w-5 h-5"}`} />
                    )}
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="user-name text-xs sm:text-sm font-medium truncate flex items-center gap-1">
                      {loading ? "Loading..." : userName}
                      {adminData && (
                        <TrophyIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" style={{ color: COLORS.richMustard }} />
                      )}
                    </div>
                    <div className="user-email text-[10px] sm:text-xs truncate" style={{ opacity: 0.75 }}>
                      {loading ? "Loading..." : userEmail}
                    </div>
                    {adminData?.phonenumber && !loading && (
                      <div
                        className="user-phone text-[9px] sm:text-[10px] truncate flex items-center gap-0.5 sm:gap-1"
                        style={{ opacity: 0.6 }}
                      >
                        <PhoneIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {adminData.phonenumber}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={isCollapsed ? "Logout" : undefined}
              className={`group relative flex items-center gap-2 sm:gap-3 mt-5 w-full px-2 sm:px-3 md:px-4 py-5 sm:py-2.5 rounded-xl transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg touch-manipulation active:scale-95 ${
                isCollapsed ? "justify-center px-1.5 sm:px-2" : ""
              }`}
              style={{
                background: `linear-gradient(135deg, ${COLORS.burntRust}15, ${COLORS.burntRust}08)`,
                color: COLORS.burntRust,
                border: `1px solid ${COLORS.burntRust}30`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.burntRust}25, ${COLORS.burntRust}15)`;
                e.currentTarget.style.borderColor = COLORS.burntRust;
                e.currentTarget.style.boxShadow = `0 4px 20px ${COLORS.burntRust}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.burntRust}15, ${COLORS.burntRust}08)`;
                e.currentTarget.style.borderColor = `${COLORS.burntRust}30`;
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
              }}
            >
              {isLoggingOut ? (
                <>
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
                    style={{ borderColor: COLORS.burntRust, borderTopColor: "transparent" }}
                  />
                  {!isCollapsed && <span className="font-medium text-xs sm:text-sm">Logging out...</span>}
                </>
              ) : (
                <>
                  <ArrowRightOnRectangleIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-xs sm:text-sm">Logout</span>
                      <span className="ml-auto text-[10px] sm:text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        →
                      </span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}