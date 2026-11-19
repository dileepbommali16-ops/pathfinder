import React, { useEffect, useState } from "react";
import { API_BASE } from "@/lib/apiClient";
import { chromeBridge, WebPageData, WebSearchResultItem } from "./chromeBridge";
import { toast } from "sonner";

type HubTab = "web" | "gmail" | "whatsapp";

interface GmailListItem {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

interface GmailReadItem {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  date?: string;
  body: string;
}

interface ContactMatchItem {
  name: string;
  email: string;
  phone: string;
  source?: string;
}

interface AutomationWorkspaceDrawerProps {
  gmailConnected: boolean;
  chromeBridgeReady: boolean;
}

export const AutomationWorkspaceDrawer: React.FC<AutomationWorkspaceDrawerProps> = ({
  gmailConnected,
  chromeBridgeReady,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HubTab>("web");

  // Web Search & Reader state
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<WebSearchResultItem[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [pageData, setPageData] = useState<WebPageData | null>(null);
  const [pageLoading, setPageLoading] = useState(false);

  // Live Gmail Workspace state
  const [gmailQuery, setGmailQuery] = useState("");
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailNeedsAuth, setGmailNeedsAuth] = useState(false);
  const [gmailEmails, setGmailEmails] = useState<GmailListItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailReadItem | null>(null);
  const [composeMode, setComposeMode] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingGmail, setSendingGmail] = useState(false);
  const [contactSearching, setContactSearching] = useState(false);
  const [gmailContactMatches, setGmailContactMatches] = useState<ContactMatchItem[]>([]);

  // WhatsApp Messaging state
  const [waContact, setWaContact] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waStatusNote, setWaStatusNote] = useState("");
  const [waContactMatches, setWaContactMatches] = useState<ContactMatchItem[]>([]);

  const userEmail =
    (typeof window !== "undefined" ? localStorage.getItem("userEmail") : "") ||
    "dileepbommali16@gmail.com";

  const lookupContacts = async (query: string, mode: "gmail" | "whatsapp") => {
    const cleanQ = query.trim();
    if (!cleanQ) {
      toast.info("Type a contact name first (e.g. Priyanka or Murali Sir).");
      return;
    }
    setContactSearching(true);
    try {
      const resp = await fetch(
        `${API_BASE}/api/google/contacts/search?email=${encodeURIComponent(userEmail)}&q=${encodeURIComponent(cleanQ)}&max_results=6`,
        { cache: "no-store" }
      );
      const data = await resp.json();
      const list: ContactMatchItem[] = Array.isArray(data?.contacts) ? data.contacts : [];
      if (mode === "gmail") {
        const emailList = list.filter((c) => Boolean(c.email));
        setGmailContactMatches(emailList);
        if (emailList.length === 1) {
          setComposeTo(emailList[0].email);
          toast.success(`Found ${emailList[0].name} (${emailList[0].email})`);
        } else if (emailList.length === 0) {
          toast.info(`No email contact found for "${cleanQ}". Reconnect OAuth with People API or enter email directly.`);
        }
      } else {
        setWaContactMatches(list);
        const withPhone = list.filter((c) => Boolean(c.phone));
        if (withPhone.length >= 1) {
          setWaPhone(withPhone[0].phone);
          toast.success(`Resolved phone for ${withPhone[0].name}: ${withPhone[0].phone}`);
        } else if (list.length === 0) {
          toast.info(`No phone number found for "${cleanQ}". Enable People API & Reconnect OAuth or type phone number.`);
        }
      }
    } catch {
      toast.error("Contact lookup failed.");
    } finally {
      setContactSearching(false);
    }
  };

  const fetchGmailList = async (qOverride?: string) => {
    setGmailLoading(true);
    try {
      const q = typeof qOverride === "string" ? qOverride : gmailQuery;
      const resp = await fetch(
        `${API_BASE}/api/google/gmail/list?email=${encodeURIComponent(userEmail)}&query=${encodeURIComponent(q)}&max_results=10`,
        { cache: "no-store" }
      );
      const data = await resp.json();
      if (data?.ok) {
        setGmailNeedsAuth(false);
        setGmailEmails(Array.isArray(data.emails) ? data.emails : []);
      } else {
        setGmailNeedsAuth(Boolean(data?.needs_auth));
        if (data?.message) toast.info(data.message);
      }
    } catch {
      toast.error("Could not load Gmail inbox right now.");
    } finally {
      setGmailLoading(false);
    }
  };

  const openEmailById = async (id: string) => {
    if (!id) return;
    setGmailLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/api/google/gmail/read/${encodeURIComponent(id)}?email=${encodeURIComponent(userEmail)}`,
        { cache: "no-store" }
      );
      const data = await resp.json();
      if (data?.ok) {
        setSelectedEmail(data);
        setComposeMode(false);
        setReplyText("");
      } else {
        toast.error(data?.message || "Failed to read email.");
      }
    } catch {
      toast.error("Error reading email body.");
    } finally {
      setGmailLoading(false);
    }
  };

  const handleWebSearch = async (e?: React.FormEvent, qOverride?: string) => {
    if (e) e.preventDefault();
    const q = (qOverride ?? webQuery).trim();
    if (!q) return;
    setWebLoading(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/google/web/search?q=${encodeURIComponent(q)}&max_results=8`
      );
      const data = await r.json();
      const items: WebSearchResultItem[] = Array.isArray(data?.results) ? data.results : [];
      setWebResults(items);
      chromeBridge.lastWebResults = items;
    } catch {
      toast.error("Web search failed.");
    } finally {
      setWebLoading(false);
    }
  };

  const openAndReadPage = async (url: string, explainAloud = false) => {
    if (!url) return;
    setPageLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/google/web/read?url=${encodeURIComponent(url)}`);
      const data = await r.json();
      const readObj: WebPageData = {
        url: data?.url || url,
        title: data?.title || url,
        headings: Array.isArray(data?.headings) ? data.headings : [],
        links: Array.isArray(data?.links) ? data.links : [],
        text: data?.text || "",
      };
      setPageData(readObj);
      chromeBridge.lastPageData = readObj;
      if (explainAloud && (readObj.text || readObj.title)) {
        window.dispatchEvent(
          new CustomEvent("das-ask-coach", {
            detail: {
              query: `Explain the webpage "${readObj.title}" (${readObj.url}) concisely based on its content: ${(readObj.text || "").slice(0, 900)}`,
            },
          })
        );
      }
    } catch {
      toast.error("Could not extract page content.");
    } finally {
      setPageLoading(false);
    }
  };

  const handleSendRealEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeBody.trim()) {
      toast.error("Recipient email and message body are required.");
      return;
    }
    setSendingGmail(true);
    try {
      const resp = await fetch(`${API_BASE}/api/google/gmail/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          recipient_email: composeTo.trim(),
          subject: composeSubject.trim() || "Message from Pathfinder DAS",
          body: composeBody.trim(),
        }),
      });
      const data = await resp.json();
      if (data?.success || data?.ok) {
        toast.success(data.message || `Email sent to ${composeTo}`);
        setComposeMode(false);
        setComposeSubject("");
        setComposeBody("");
        void fetchGmailList();
      } else {
        toast.error(data?.message || "Could not send email.");
      }
    } catch {
      toast.error("Failed to send Gmail.");
    } finally {
      setSendingGmail(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeTo.trim() && !composeBody.trim()) return;
    setSendingGmail(true);
    try {
      const resp = await fetch(`${API_BASE}/api/google/gmail/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          recipient_email: composeTo.trim(),
          subject: composeSubject.trim() || "Draft from DAS AI",
          body: composeBody.trim(),
        }),
      });
      const data = await resp.json();
      if (data?.ok) {
        toast.success("Saved real Gmail draft!");
      } else {
        toast.error(data?.message || "Failed to save draft.");
      }
    } catch {
      toast.error("Draft request failed.");
    } finally {
      setSendingGmail(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !replyText.trim()) return;
    const matchEmail = selectedEmail.from.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const replyTo = matchEmail ? matchEmail[0] : selectedEmail.from;
    const replySubj = selectedEmail.subject.startsWith("Re:")
      ? selectedEmail.subject
      : `Re: ${selectedEmail.subject}`;
    setSendingGmail(true);
    try {
      const resp = await fetch(`${API_BASE}/api/google/gmail/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          recipient_email: replyTo,
          subject: replySubj,
          body: replyText.trim(),
          thread_id: selectedEmail.threadId || "",
        }),
      });
      const data = await resp.json();
      if (data?.success || data?.ok) {
        toast.success(`Reply sent to ${replyTo}!`);
        setReplyText("");
      } else {
        toast.error(data?.message || "Failed to send reply.");
      }
    } catch {
      toast.error("Reply failed.");
    } finally {
      setSendingGmail(false);
    }
  };

  useEffect(() => {
    const onOpenDrawer = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const requestedTab = detail.tab as HubTab | undefined;
      if (requestedTab === "web" || requestedTab === "gmail" || requestedTab === "whatsapp") {
        setActiveTab(requestedTab);
        if (requestedTab === "gmail") {
          void fetchGmailList();
        }
      }
      setIsOpen(true);
    };

    const onAutomationUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      if (!detail || typeof detail !== "object") return;

      if (detail.kind === "close_drawer") {
        setIsOpen(false);
        return;
      }

      if (detail.kind === "web") {
        if (detail.query) setWebQuery(String(detail.query));
        if (Array.isArray(detail.results)) {
          setWebResults(detail.results);
          chromeBridge.lastWebResults = detail.results;
        }
        if (detail.url && (detail.text || detail.headings)) {
          setPageData({
            url: String(detail.url),
            title: String(detail.title || detail.url),
            headings: Array.isArray(detail.headings) ? detail.headings : [],
            links: Array.isArray(detail.links || detail.clickables) ? (detail.links || detail.clickables) : [],
            text: String(detail.text || ""),
          });
        }
        if (detail.openDrawer) {
          setActiveTab("web");
          setIsOpen(true);
        }
      }

      if (detail.kind === "gmail") {
        if (typeof detail.query === "string") setGmailQuery(detail.query);
        if (Array.isArray(detail.emails)) {
          setGmailEmails(detail.emails);
          setGmailNeedsAuth(false);
        }
        if (detail.needs_auth) setGmailNeedsAuth(true);
        if (detail.action === "read_email" && detail.ok && detail.body) {
          setSelectedEmail({
            id: String(detail.id || ""),
            threadId: detail.threadId,
            from: String(detail.from || ""),
            to: detail.to,
            subject: String(detail.subject || ""),
            date: detail.date,
            body: String(detail.body || ""),
          });
        }
        if (detail.recipient_email) setComposeTo(String(detail.recipient_email));
        if (detail.subject) setComposeSubject(String(detail.subject));
        if (detail.body) setComposeBody(String(detail.body));
        if (detail.openDrawer) {
          setActiveTab("gmail");
          setIsOpen(true);
          if (!Array.isArray(detail.emails)) {
            void fetchGmailList(typeof detail.query === "string" ? detail.query : "");
          }
        }
      }

      if (detail.kind === "whatsapp") {
        if (detail.contact) setWaContact(String(detail.contact));
        if (detail.phone) setWaPhone(String(detail.phone));
        if (detail.message) setWaMessage(String(detail.message));
        if (detail.error) setWaStatusNote(String(detail.error));
        else if (detail.message || detail.waUrl) {
          setWaStatusNote(
            chromeBridgeReady
              ? "Dispatched via Chrome WhatsApp Web."
              : "Ready! Tap Open in WhatsApp below to send on your device."
          );
        }
        if (detail.openDrawer) {
          setActiveTab("whatsapp");
          setIsOpen(true);
        }
      }
    };

    window.addEventListener("das:open-automation-drawer", onOpenDrawer);
    window.addEventListener("das:automation-update", onAutomationUpdate);
    return () => {
      window.removeEventListener("das:open-automation-drawer", onOpenDrawer);
      window.removeEventListener("das:automation-update", onAutomationUpdate);
    };
  }, [chromeBridgeReady]);

  if (!isOpen) return null;

  const cleanWaDigits = waPhone.replace(/[^\d]/g, "");
  const computedWaUrl = cleanWaDigits
    ? `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(waMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;

  const oauthStartUrl = `${API_BASE}/api/auth/google/workspace/start?origin=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.origin : "https://pathfinder-client-fzom.vercel.app"
  )}`;

  return (
    <div
      className="fixed top-14 left-2 right-2 sm:left-auto sm:top-16 sm:right-5 z-50 sm:w-[94%] max-w-2xl max-h-[78vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border text-white"
      style={{
        backgroundColor: "#000000",
        borderColor: "#2B2024",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.94)",
      }}
    >
      {/* Header + 3 Tabs */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b"
        style={{ borderColor: "#2B2024", backgroundColor: "#000000" }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: "web", label: "🌐 Web & Links" },
              { id: "gmail", label: "✉️ Live Gmail" },
              { id: "whatsapp", label: "💬 WhatsApp / Msg" },
            ] as const
          ).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  if (t.id === "gmail" && gmailEmails.length === 0) {
                    void fetchGmailList();
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border text-white"
                style={{
                  backgroundColor: active ? "#FD0053" : "#2B2024",
                  borderColor: active ? "#A80139" : "#2B2024",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold border text-white cursor-pointer hover:brightness-110"
          style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
          aria-label="Close Automation Hub"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 das-scrollbar">
        {/* TAB 1: WEB SEARCH, CLICKABLE RESULTS & PAGE READER */}
        {activeTab === "web" && (
          <div className="space-y-3">
            <form onSubmit={(e) => void handleWebSearch(e)} className="flex items-center gap-2">
              <input
                type="text"
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
                placeholder="Search Google & open any link (e.g. Claude Code official)..."
                className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white border focus:outline-none"
                style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
              />
              <button
                type="submit"
                disabled={webLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
              >
                {webLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {webResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-zinc-300">
                  Search Results ({webResults.length})
                </div>
                {webResults.map((res) => (
                  <div
                    key={`${res.index}-${res.url}`}
                    className="rounded-xl p-2.5 border space-y-1.5"
                    style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2B2024] text-white">
                            #{res.index}
                          </span>
                          {(res.isOfficial || res.is_official) && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: "#FD0053" }}
                            >
                              OFFICIAL
                            </span>
                          )}
                          <span className="text-xs font-bold text-white truncate">{res.title}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">{res.url}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void openAndReadPage(res.url, true)}
                          className="px-2 py-1 rounded text-[10px] font-bold text-white cursor-pointer border"
                          style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                        >
                          Open & Explain
                        </button>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded text-[10px] font-bold text-white border"
                          style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                        >
                          Tab ↗
                        </a>
                      </div>
                    </div>
                    {res.snippet && (
                      <p className="text-[11px] text-zinc-300 leading-snug">{res.snippet}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(pageLoading || pageData) && (
              <div
                className="rounded-xl p-3 border space-y-2"
                style={{ backgroundColor: "#000000", borderColor: "#A80139" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {pageLoading ? "Reading page..." : pageData?.title}
                    </div>
                    {pageData?.url && (
                      <div className="text-[10px] text-zinc-400 truncate">{pageData.url}</div>
                    )}
                  </div>
                  {pageData && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("das-ask-coach", {
                              detail: {
                                query: `Explain "${pageData.title}" (${pageData.url}) concisely: ${(pageData.text || "").slice(0, 900)}`,
                              },
                            })
                          )
                        }
                        className="px-2 py-1 rounded text-[10px] font-bold text-white cursor-pointer border"
                        style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
                      >
                        Explain Aloud
                      </button>
                      <a
                        href={pageData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-[10px] font-bold text-white border"
                        style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                      >
                        Open ↗
                      </a>
                    </div>
                  )}
                </div>

                {pageData?.headings && pageData.headings.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pageData.headings.slice(0, 6).map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded border text-zinc-200"
                        style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {pageData?.text && (
                  <div className="text-xs text-zinc-200 leading-relaxed max-h-40 overflow-y-auto das-scrollbar whitespace-pre-wrap">
                    {pageData.text}
                  </div>
                )}

                {pageData?.links && pageData.links.length > 0 && (
                  <div className="pt-1 border-t border-[#2B2024] space-y-1">
                    <div className="text-[10px] font-bold text-zinc-400">Page Links (click to navigate):</div>
                    <div className="flex flex-wrap gap-1.5">
                      {pageData.links.slice(0, 8).map((lnk, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => void openAndReadPage(lnk.href, true)}
                          className="text-[10px] px-2 py-1 rounded border text-white cursor-pointer truncate max-w-[200px]"
                          style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                          title={lnk.href}
                        >
                          {lnk.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE GMAIL INBOX, READER, REPLY & COMPOSE */}
        {activeTab === "gmail" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchGmailList();
                }}
                className="flex flex-1 min-w-[200px] items-center gap-1.5"
              >
                <input
                  type="text"
                  value={gmailQuery}
                  onChange={(e) => setGmailQuery(e.target.value)}
                  placeholder="Search Gmail (e.g. is:unread, interview)..."
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                  style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                  style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                >
                  Search
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setComposeMode(false);
                  setSelectedEmail(null);
                  setGmailQuery("");
                  void fetchGmailList("");
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
              >
                Inbox
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposeMode(false);
                  setSelectedEmail(null);
                  setGmailQuery("is:unread");
                  void fetchGmailList("is:unread");
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmail(null);
                  setComposeMode((v) => !v);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
              >
                + Compose
              </button>
              <a
                href="https://mail.google.com/mail/u/0/#inbox"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white border"
                style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
              >
                Gmail Web ↗
              </a>
              <a
                href={oauthStartUrl}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white border"
                style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                title="Reconnect Google OAuth to grant Gmail & Contacts permissions"
              >
                Reconnect OAuth
              </a>
            </div>

            {(!gmailConnected || gmailNeedsAuth) && (
              <div
                className="rounded-xl p-3 border flex items-center justify-between gap-2"
                style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
              >
                <div className="text-xs text-white">
                  Connect Google Workspace OAuth once so DAS can read and send your Gmail on Phone, Tablet & Laptop.
                </div>
                <a
                  href={oauthStartUrl}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shrink-0 border"
                  style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
                >
                  Connect Gmail
                </a>
              </div>
            )}

            {composeMode && (
              <form
                onSubmit={(e) => void handleSendRealEmail(e)}
                className="rounded-xl p-3 border space-y-2"
                style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
              >
                <div className="text-xs font-bold text-white">Compose Real Email (via {userEmail})</div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="To (email or contact name like Priyanka)..."
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                    style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                  />
                  <button
                    type="button"
                    disabled={contactSearching}
                    onClick={() => void lookupContacts(composeTo, "gmail")}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border shrink-0"
                    style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                  >
                    {contactSearching ? "Finding..." : "Find Contact"}
                  </button>
                </div>
                {gmailContactMatches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {gmailContactMatches.map((c) => (
                      <button
                        key={c.email}
                        type="button"
                        onClick={() => {
                          setComposeTo(c.email);
                          setGmailContactMatches([]);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold text-white cursor-pointer border"
                        style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                      >
                        {c.name} · {c.email}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject..."
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                  style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                />
                <textarea
                  rows={4}
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write email message..."
                  className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                  style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={sendingGmail}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                    style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
                  >
                    {sendingGmail ? "Sending..." : "Send Email"}
                  </button>
                  <button
                    type="button"
                    disabled={sendingGmail}
                    onClick={() => void handleSaveDraft()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                    style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                  >
                    Save Draft
                  </button>
                </div>
              </form>
            )}

            {selectedEmail && !composeMode && (
              <div
                className="rounded-xl p-3 border space-y-2.5"
                style={{ backgroundColor: "#000000", borderColor: "#A80139" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">{selectedEmail.subject}</div>
                    <div className="text-[11px] text-zinc-400">From: {selectedEmail.from}</div>
                    {selectedEmail.date && (
                      <div className="text-[10px] text-zinc-500">{selectedEmail.date}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmail(null)}
                    className="px-2 py-1 rounded text-[10px] font-bold text-white cursor-pointer border"
                    style={{ backgroundColor: "#2B2024", borderColor: "#2B2024" }}
                  >
                    ← Back
                  </button>
                </div>
                <div className="text-xs text-zinc-200 whitespace-pre-wrap max-h-44 overflow-y-auto das-scrollbar border-t border-b border-[#2B2024] py-2">
                  {selectedEmail.body}
                </div>
                <form onSubmit={(e) => void handleSendReply(e)} className="space-y-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write quick reply..."
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                    style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                  />
                  <button
                    type="submit"
                    disabled={sendingGmail}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-white cursor-pointer border"
                    style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
                  >
                    {sendingGmail ? "Sending Reply..." : "Send Reply"}
                  </button>
                </form>
              </div>
            )}

            {!selectedEmail && !composeMode && (
              <div className="space-y-1.5">
                {gmailLoading ? (
                  <div className="text-xs text-zinc-400 py-4 text-center">Loading Gmail inbox...</div>
                ) : gmailEmails.length === 0 ? (
                  <div className="text-xs text-zinc-400 py-4 text-center">
                    No messages loaded. Tap Inbox above or Search to inspect your emails.
                  </div>
                ) : (
                  gmailEmails.map((em) => (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => void openEmailById(em.id)}
                      className="w-full text-left rounded-xl p-2.5 border transition cursor-pointer hover:brightness-110"
                      style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{em.subject}</span>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {em.date.slice(0, 16)}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-300 truncate">{em.from}</div>
                      {em.snippet && (
                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">{em.snippet}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WHATSAPP / DIRECT MESSAGING */}
        {activeTab === "whatsapp" && (
          <div className="space-y-3">
            <div className="rounded-xl p-3 border space-y-2" style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}>
              <div className="text-xs font-bold text-white">WhatsApp Quick Send (Laptop Chrome + Phone/Tablet)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={waContact}
                    onChange={(e) => setWaContact(e.target.value)}
                    placeholder="Contact Name (e.g. Priyanka)..."
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                    style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                  />
                  <button
                    type="button"
                    disabled={contactSearching}
                    onClick={() => void lookupContacts(waContact, "whatsapp")}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border shrink-0"
                    style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                  >
                    {contactSearching ? "..." : "Find"}
                  </button>
                </div>
                <input
                  type="text"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="Phone (+919876543210) for 1-Tap..."
                  className="rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                  style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
                />
              </div>
              {waContactMatches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {waContactMatches.map((c, idx) => (
                    <button
                      key={`${c.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        setWaContact(c.name);
                        if (c.phone) setWaPhone(c.phone);
                        setWaContactMatches([]);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-semibold text-white cursor-pointer border"
                      style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                    >
                      {c.name}{c.phone ? ` · ${c.phone}` : c.email ? ` · ${c.email}` : ""}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                rows={3}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                placeholder="Type WhatsApp message..."
                className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white border focus:outline-none"
                style={{ backgroundColor: "#000000", borderColor: "#2B2024" }}
              />
              {waStatusNote && (
                <div className="text-[11px] text-zinc-300">{waStatusNote}</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {chromeBridgeReady && (
                  <button
                    type="button"
                    onClick={() =>
                      void chromeBridge.runWhatsAppAction({
                        action: "send_message",
                        contact: waContact,
                        phone: waPhone,
                        message: waMessage,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer border"
                    style={{ backgroundColor: "#FD0053", borderColor: "#A80139" }}
                  >
                    Send via Chrome Web
                  </button>
                )}
                <a
                  href={computedWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white border inline-flex items-center gap-1"
                  style={{ backgroundColor: "#2B2024", borderColor: "#A80139" }}
                >
                  Open in WhatsApp ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
