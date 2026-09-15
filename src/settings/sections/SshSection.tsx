import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  newSshGroupId,
  setSshGroups,
  setSshHosts,
  type SshAuth,
  type SshGroup,
  type SshHost,
} from "@/modules/settings/store";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { useRef, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";

const GROUP_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

type EditingHost = {
  draft: SshHost;
  isNew: boolean;
  testing: boolean;
  error: string | null;
};

export function SshSection() {
  const sshHosts = usePreferencesStore((s) => s.sshHosts);
  const sshGroups = usePreferencesStore((s) => s.sshGroups);
  const [editing, setEditing] = useState<EditingHost | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupComboValue, setGroupComboValue] = useState("");
  const importRef = useRef<HTMLInputElement | null>(null);

  const persistHosts = async (next: SshHost[]) => {
    await setSshHosts(next);
  };

  const persistGroups = async (next: SshGroup[]) => {
    await setSshGroups(next);
  };

  const startNew = (groupId: string | null = null) => {
    setEditing({
      draft: {
        id: `ssh-${Date.now()}`,
        label: "",
        host: "",
        port: 22,
        user: "",
        auth: { kind: "agent" },
        groupId,
      },
      isNew: true,
      testing: false,
      error: null,
    });
    setGroupComboValue(groupId ?? "");
  };

  const startEdit = (host: SshHost) => {
    setEditing({ draft: { ...host, auth: { ...host.auth } }, isNew: false, testing: false, error: null });
    setGroupComboValue(host.groupId ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setGroupComboValue("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.host.trim()) {
      setEditing({ ...editing, error: "Host is required." });
      return;
    }
    // Resolve group: if groupComboValue is an existing group ID, use it.
    // If it matches a group name, find that group.
    // Otherwise, create a new group.
    let groupId: string | null = null;
    if (groupComboValue) {
      const existingById = sshGroups.find((g) => g.id === groupComboValue);
      const existingByName = sshGroups.find((g) => g.name === groupComboValue);
      if (existingById) {
        groupId = existingById.id;
      } else if (existingByName) {
        groupId = existingByName.id;
      } else {
        // Create new group
        const newGroup: SshGroup = {
          id: newSshGroupId(),
          name: groupComboValue,
          color: GROUP_COLORS[sshGroups.length % GROUP_COLORS.length],
        };
        await persistGroups([...sshGroups, newGroup]);
        groupId = newGroup.id;
      }
    }
    const label = d.label.trim() || `${d.user ? `${d.user}@` : ""}${d.host}`;
    const host: SshHost = { ...d, host: d.host.trim(), label, user: d.user.trim(), groupId };
    if (editing.isNew) {
      await persistHosts([...sshHosts, host]);
    } else {
      await persistHosts(sshHosts.map((h) => (h.id === host.id ? host : h)));
    }
    cancelEdit();
  };

  const testConnection = async () => {
    if (!editing) return;
    setEditing({ ...editing, testing: true, error: null });
    try {
      await invoke("ssh_test_connection", { host: editing.draft });
      setEditing((e) => (e ? { ...e, testing: false } : null));
    } catch (err) {
      setEditing((e) => (e ? { ...e, testing: false, error: String(err) } : null));
    }
  };

  const removeHost = async (id: string) => {
    await persistHosts(sshHosts.filter((h) => h.id !== id));
  };

  const importFromConfig = async () => {
    setImporting(true);
    try {
      const count = await invoke<number>("ssh_import_from_config");
      if (count > 0) {
        const hosts = await invoke<SshHost[]>("ssh_list_hosts");
        await persistHosts(hosts);
      }
    } finally {
      setImporting(false);
    }
  };

  // Group by groupId
  const hostsByGroup = new Map<string | null, SshHost[]>();
  for (const host of sshHosts) {
    const gid = host.groupId;
    if (!hostsByGroup.has(gid)) hostsByGroup.set(gid, []);
    hostsByGroup.get(gid)!.push(host);
  }

  const topLevelGroups = sshGroups.filter((g) => g.id !== "default");
  const defaultGroupHosts = hostsByGroup.get("default") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="SSH"
        description="管理 SSH 主機，支援分組管理。"
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>SSH Hosts</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={importFromConfig}
              disabled={importing}
            >
              {importing ? "Importing..." : "Import from ~/.ssh/config"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={() => startNew()}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={11} strokeWidth={2} />
              Add Host
            </Button>
          </div>
        </div>

        {/* Groups */}
        {sshHosts.length === 0 ? (
          <p className="rounded-lg border border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
            No SSH hosts configured. Add one or import from ~/.ssh/config.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Top-level groups with hosts */}
            {topLevelGroups.map((group) => {
              const groupHosts = hostsByGroup.get(group.id) ?? [];
              if (groupHosts.length === 0) return null;
              return (
                <div key={group.id} className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="flex items-center gap-2 bg-card/60 px-3 py-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: group.color }} />
                    <span className="text-[12px] font-medium">{group.name}</span>
                    <span className="text-[10px] text-muted-foreground">{groupHosts.length}</span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      className="h-6 rounded px-2 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => startNew(group.id)}
                    >
                      + Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1">
                    {groupHosts.map((host) => (
                      <SshHostItem
                        key={host.id}
                        host={host}
                        onConnect={() => {}}
                        onEdit={() => startEdit(host)}
                        onDelete={() => void removeHost(host.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Default group hosts */}
            {defaultGroupHosts.length > 0 && (
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="flex items-center gap-2 bg-card/60 px-3 py-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#6366f1" }} />
                  <span className="text-[12px] font-medium">預設</span>
                  <span className="text-[10px] text-muted-foreground">{defaultGroupHosts.length}</span>
                  <div className="flex-1" />
                  <button
                    type="button"
                    className="h-6 rounded px-2 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => startNew("default")}
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 p-1">
                  {defaultGroupHosts.map((host) => (
                    <SshHostItem
                      key={host.id}
                      host={host}
                      onConnect={() => {}}
                      onEdit={() => startEdit(host)}
                      onDelete={() => void removeHost(host.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ungrouped hosts */}
            {(hostsByGroup.get(null) ?? []).length > 0 && (
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="flex items-center gap-2 bg-card/60 px-3 py-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground" />
                  <span className="text-[12px] font-medium">未分組</span>
                  <span className="text-[10px] text-muted-foreground">{hostsByGroup.get(null)!.length}</span>
                </div>
                <div className="flex flex-col gap-0.5 p-1">
                  {hostsByGroup.get(null)!.map((host) => (
                    <SshHostItem
                      key={host.id}
                      host={host}
                      onConnect={() => {}}
                      onEdit={() => startEdit(host)}
                      onDelete={() => void removeHost(host.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editing form */}
        {editing && (
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
            <SettingRow title="Label" description="Display name for this host.">
              <Input
                value={editing.draft.label}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, label: e.target.value } })}
                placeholder="My Server"
                className="h-8 w-48 text-[12px]"
              />
            </SettingRow>
            <SettingRow title="Host" description="Hostname or IP address.">
              <Input
                value={editing.draft.host}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, host: e.target.value } })}
                placeholder="example.com"
                className="h-8 w-48 text-[12px]"
              />
            </SettingRow>
            <SettingRow title="Port" description="SSH port (default 22).">
              <Input
                type="number"
                value={editing.draft.port}
                onChange={(e) => {
                  const port = parseInt(e.target.value, 10);
                  setEditing({ ...editing, draft: { ...editing.draft, port: Number.isFinite(port) ? port : 22 } });
                }}
                className="h-8 w-20 text-[12px]"
              />
            </SettingRow>
            <SettingRow title="User" description="Username for login.">
              <Input
                value={editing.draft.user}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, user: e.target.value } })}
                placeholder="root"
                className="h-8 w-48 text-[12px]"
              />
            </SettingRow>
            <SettingRow title="Group" description="Select or type a new group.">
              <div className="flex items-center gap-2">
                <Input
                  value={groupComboValue}
                  onChange={(e) => setGroupComboValue(e.target.value)}
                  placeholder="Select or type group..."
                  className="h-8 w-48 text-[12px]"
                  list="ssh-group-suggestions"
                />
                <datalist id="ssh-group-suggestions">
                  {sshGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </datalist>
                <Select
                  value=""
                  onValueChange={(v) => {
                    const g = sshGroups.find((x) => x.id === v);
                    if (g) setGroupComboValue(g.id);
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-8 text-[12px] px-2">
                    <SelectValue placeholder="▼" />
                  </SelectTrigger>
                  <SelectContent>
                    {sshGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-[12px]">
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SettingRow>
            <SettingRow title="Authentication" description="How to authenticate.">
              <Select
                value={editing.draft.auth.kind}
                onValueChange={(v) => {
                  const kind = v as SshAuth["kind"];
                  const auth: SshAuth = kind === "key" ? { kind: "key", path: "" } : { kind };
                  setEditing({ ...editing, draft: { ...editing.draft, auth } });
                }}
              >
                <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent" className="text-[12px]">SSH Agent</SelectItem>
                  <SelectItem value="key" className="text-[12px]">Private Key</SelectItem>
                  <SelectItem value="password" className="text-[12px]">Password</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            {editing.draft.auth.kind === "key" && (
              <SettingRow title="Key path" description="Path to private key file.">
                <div className="flex items-center gap-2">
                  <Input
                    value={editing.draft.auth.kind === "key" ? editing.draft.auth.path : ""}
                    onChange={(e) => {
                      if (editing.draft.auth.kind === "key") {
                        setEditing({ ...editing, draft: { ...editing.draft, auth: { ...editing.draft.auth, path: e.target.value } } });
                      }
                    }}
                    placeholder="~/.ssh/id_ed25519"
                    className="h-8 w-56 text-[12px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => importRef.current?.click()}
                  >
                    Browse
                  </Button>
                  <input
                    ref={importRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && editing.draft.auth.kind === "key") {
                        const path = (file as any).path || file.name;
                        setEditing({ ...editing, draft: { ...editing.draft, auth: { ...editing.draft.auth, path } } });
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
              </SettingRow>
            )}

            {editing.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11.5px] text-destructive">
                {editing.error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => void testConnection()} disabled={editing.testing}>
                {editing.testing ? "Testing..." : "Test"}
              </Button>
              <Button size="sm" className="h-7 px-3 text-[11px]" onClick={() => void saveEdit()}>
                {editing.isNew ? "Add" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Group management */}
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <Label>Groups</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => setEditingGroup("new")}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={10} strokeWidth={1.75} />
              New Group
            </Button>
          </div>
          {editingGroup && (
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="h-7 text-[11px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newGroupName.trim()) {
                    const newGroup: SshGroup = {
                      id: newSshGroupId(),
                      name: newGroupName.trim(),
                      color: GROUP_COLORS[sshGroups.length % GROUP_COLORS.length],
                    };
                    void persistGroups([...sshGroups, newGroup]);
                    setNewGroupName("");
                    setEditingGroup(null);
                  }
                  if (e.key === "Escape") { setEditingGroup(null); setNewGroupName(""); }
                }}
              />
              <Button size="sm" className="h-7 px-2 text-[10px]" onClick={() => {
                if (newGroupName.trim()) {
                  const newGroup: SshGroup = {
                    id: newSshGroupId(),
                    name: newGroupName.trim(),
                    color: GROUP_COLORS[sshGroups.length % GROUP_COLORS.length],
                  };
                  void persistGroups([...sshGroups, newGroup]);
                  setNewGroupName("");
                  setEditingGroup(null);
                }
              }}>Add</Button>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {sshGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-card/60">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: group.color }} />
                <span className="flex-1 text-[11px]">{group.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {sshHosts.filter((h) => h.groupId === group.id).length} hosts
                </span>
                {group.id !== "default" && (
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      void persistGroups(sshGroups.filter((g) => g.id !== group.id));
                      void persistHosts(sshHosts.map((h) => (h.groupId === group.id ? { ...h, groupId: "default" } : h)));
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SshHostItem({
  host,
  onConnect,
  onEdit,
  onDelete,
}: {
  host: SshHost;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-card/60">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[12px] font-medium">{host.label}</span>
        <span className="truncate text-[10.5px] text-muted-foreground">
          {host.user ? `${host.user}@` : ""}{host.host}:{host.port}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onConnect}>
          Connect
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive" onClick={onDelete}>
          ×
        </Button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
