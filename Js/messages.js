const supabaseUrl = 'https://gsjnjktqqyxankennpau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzam5qa3RxcXl4YW5rZW5ucGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzczMjksImV4cCI6MjA4OTkxMzMyOX0.ZrW8S0n3PkJJb_blIUkzgtav6REqPz6RI5zOniwR64E';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);


let currentUser = null;
let userProfile = null;
let currentRoleView = null; 
let selectedUserId = null;
let allEmployees = [];
let pendingFile = null; 
const APP_ID = "20a58ffd528747babda110ec8272d7dc";

let localTracks = { videoTrack: null, audioTrack: null };
const client = typeof AgoraRTC !== 'undefined' ? AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }) : null;

async function init() {
    console.log("System: Initializing HRMS Messaging...");
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    
    if (sessionError || !session) {
        window.location.href = "index.html";
        return;
    }
    
    currentUser = session.user;

    const { data: check } = await _supabase
        .from('employees')
        .select('status')
        .eq('user_id', currentUser.id)
        .single();

    if (check && (['Approved', 'online', 'offline'].includes(check.status))) {
        await _supabase.from('employees').update({ 
            status: 'online', 
            last_seen: new Date().toISOString() 
        }).eq('user_id', currentUser.id);
    } else {
        window.location.href = "index.html";
        return;
    }

    await fetchUserProfile();
    await updateRecruitmentBadge();
    await loadEmployees();
    
    setupPresence(currentUser.id);

    setupRealtimeSubscription();
    setupUIListeners();
}


async function fetchUserProfile() {
    try {
        const { data, error } = await _supabase
            .from('employees')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (data) {
            userProfile = data;
            currentRoleView = data.role;
            renderUserUI();
        }
    } catch (err) {
        console.error("Profile Fetch Error:", err);
    }
}

function renderUserUI() {
    if (!userProfile) return;
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.innerText = `${userProfile.first_name} ${userProfile.last_name}`;
    
    const thumbContainer = document.getElementById('userInitials');
    if (thumbContainer) {
        if (userProfile.avatar_url) {
            thumbContainer.innerHTML = `<img src="${userProfile.avatar_url}" style="width:100%; height:100%; border-radius:30%; object-fit:cover;">`;
            thumbContainer.style.background = "transparent";
        } else {
            thumbContainer.innerText = (userProfile.first_name[0] + userProfile.last_name[0]).toUpperCase();
            thumbContainer.style.background = "#e2e8f0";
        }
    }

    const roleDisplay = { 'SuperAdmin': 'CEO ', 'Admin': 'Manager ', 'User': 'Employee ' };
    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.innerText = roleDisplay[currentRoleView] || currentRoleView;

    document.querySelectorAll('.auth-admin').forEach(el => el.style.display = (currentRoleView === 'Admin' || currentRoleView === 'SuperAdmin') ? 'block' : 'none');
    document.querySelectorAll('.auth-super').forEach(el => el.style.display = (currentRoleView === 'SuperAdmin') ? 'block' : 'none');

    const switcher = document.getElementById('superAdminTools');
    if (userProfile.role === 'SuperAdmin' && switcher) {
        switcher.style.display = 'flex';
        const roleSwitchEl = document.getElementById('roleSwitcher');
        if (roleSwitchEl) roleSwitchEl.value = currentRoleView;
    }
}

window.previewRole = (newRole) => {
    currentRoleView = newRole;
    renderUserUI();
};


async function loadEmployees() {
    try {
        const { data, error } = await _supabase
            .from('employees')
            .select('user_id, first_name, last_name, avatar_url, role, status, last_seen')
            .neq('user_id', currentUser.id);

        if (error) throw error;
        allEmployees = data;
        renderConversationList(data);
    } catch (err) {
        console.error("Load Employees Error:", err.message);
    }
}

function renderConversationList(employees) {
    const listContainer = document.getElementById('conversationList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    employees.forEach(emp => {
        const div = document.createElement('div');
        div.className = 'convo-item';
        div.id = `convo-${emp.user_id}`;
        div.onclick = () => selectUser(emp);
        const avatarStyle = emp.avatar_url ? `background-image: url('${emp.avatar_url}'); background-size: cover;` : '';
        const initials = (emp.first_name[0] + emp.last_name[0]).toUpperCase();
        
        div.innerHTML = `
            <div class="convo-avatar" style="${avatarStyle}">${emp.avatar_url ? '' : initials}</div>
            <div class="convo-info">
                <div class="convo-name">${emp.first_name} ${emp.last_name}</div>
                <div class="convo-preview">${emp.role}</div>
            </div>`;
        listContainer.appendChild(div);
    });
}

async function selectUser(user) {
    selectedUserId = user.user_id;
    document.querySelectorAll('.convo-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`convo-${user.user_id}`)?.classList.add('active');
    
    const header = document.getElementById('chatHeader');
    const inputArea = document.getElementById('inputArea');
    const chatName = document.getElementById('chatUserName');
    
    if(header) header.style.display = 'flex';
    if(inputArea) inputArea.style.display = 'flex';
    if(chatName) chatName.innerText = `${user.first_name} ${user.last_name}`;
    
    const statusEl = document.getElementById('chatUserStatus');
    if (statusEl) {
        statusEl.innerText = user.status === 'online' ? "Active Now" : `Active ${formatLastSeen(user.last_seen)}`;
        statusEl.style.color = user.status === 'online' ? "#31a24c" : "#65676b";
    }

    const avatarHeader = document.getElementById('chatUserAvatar');
    if (avatarHeader) {
        if (user.avatar_url) {
            avatarHeader.innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            avatarHeader.innerText = (user.first_name[0] + user.last_name[0]).toUpperCase();
            avatarHeader.style.backgroundColor = '#0084ff';
            avatarHeader.style.color = 'white';
        }
    }
    loadMessages();
}

async function loadMessages() {
    if (!selectedUserId) return;
    const { data, error } = await _supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
    if (!error) renderMessages(data);
}

function toggleUserInfo() {

    const name = document.getElementById('chatUserName').innerText;
    const avatar = document.getElementById('chatUserAvatar').innerHTML;
    const status = document.getElementById('chatUserStatus').innerText;

    
    document.getElementById('modalName').innerText = name;
    document.getElementById('modalAvatar').innerHTML = avatar;
    document.getElementById('modalStatus').innerText = status;
    
    

    
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}


window.onclick = function(event) {
    const modal = document.getElementById('userModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

let userStatusChannel;

async function setupPresence(userId) {
    
    userStatusChannel = _supabase.channel('online-users', {
        config: {
            presence: {
                key: userId,
            },
        },
    });

    
    userStatusChannel
        .on('presence', { event: 'sync' }, () => {
            const newState = userStatusChannel.presenceState();
            updateStatusUI(newState);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                
                await userStatusChannel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId
                });
            }
        });
}


function updateStatusUI(onlineUsers) {
    
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const userId = item.getAttribute('data-user-id');
        const statusDot = item.querySelector('.status-dot');
        
        
        if (onlineUsers[userId]) {
            statusDot.style.background = '#22c55e'; 
            if (selectedUserId === userId) {
                document.getElementById('chatUserStatus').innerText = 'Online';
            }
        } else {
            statusDot.style.background = '#94a3b8'; 
            if (selectedUserId === userId) {
                document.getElementById('chatUserStatus').innerText = 'Offline';
            }
        }
    });
}

function renderMessages(messages) {
    const chatBody = document.getElementById('chatMessages');
    if (!chatBody) return;
    chatBody.innerHTML = '';
    messages.forEach(msg => appendSingleMessage(msg, false));
    chatBody.scrollTop = chatBody.scrollHeight;
}

function appendSingleMessage(msg, shouldScroll = true) {
    const chatBody = document.getElementById('chatMessages');
    
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const isMe = msg.sender_id === currentUser.id;
    const messageRow = document.createElement('div');
    messageRow.className = "message-row";
    messageRow.id = `msg-${msg.id}`;
    

    messageRow.style.cssText += `display: flex; align-items: center; justify-content: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 12px; gap: 8px;`;

   
    let contentHTML = msg.message;
    if (msg.message.startsWith('IMAGE_ATTACHMENT|')) {
        const url = msg.message.split('|')[1];
        contentHTML = `<img src="${url}" style="max-width: 250px; border-radius: 12px; cursor: pointer; display: block;" onclick="window.open('${url}')">`;
    } else if (msg.message.startsWith('FILE_ATTACHMENT|')) {
        const [_, name, url] = msg.message.split('|');
        contentHTML = `
            <div class="file-card" onclick="window.open('${url}')" style="cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1);">
                <i class="fa fa-file-text-o" style="font-size: 20px; color: #3b82f6;"></i> 
                <div style="color: #1e293b; font-size: 13px; font-weight: 500;">${name}</div>
            </div>`;
    }

    const bubble = document.createElement('div');
    bubble.className = `bubble ${isMe ? 'sent' : 'received'}`; 
    bubble.innerHTML = `<div class="message-text">${contentHTML}</div>`;

    
    if (isMe && !msg.isSending) {
        const del = document.createElement('i');
        del.className = "fa fa-trash unsend-icon";
        del.style.cssText = "cursor: pointer; color: #94a3b8; font-size: 14px; padding: 5px;";
        del.onclick = () => deleteMessage(msg.id);
        messageRow.appendChild(del);
    }

    messageRow.appendChild(bubble);
    chatBody.appendChild(messageRow);

    if (shouldScroll) {
        chatBody.scrollTo({ 
            top: chatBody.scrollHeight, 
            behavior: msg.isSending ? 'auto' : 'smooth' 
        });
    }
}


async function sendMessage(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const input = document.getElementById('messageInput');
    const messageText = input ? input.value.trim() : "";
    
    if (!selectedUserId || (!messageText && !pendingFile)) return;

    const tempId = Date.now();
    if (input) input.value = ''; 
    
    let fileToProcess = null;
    if (pendingFile) {
        fileToProcess = pendingFile;
        pendingFile = null; 
        clearPreview();     
    }

    if (messageText && !fileToProcess) {
        appendSingleMessage({
            id: tempId,
            sender_id: currentUser.id,
            message: messageText,
            isSending: true 
        });

        
        _supabase.from('messages').insert([{ 
            sender_id: currentUser.id, 
            receiver_id: selectedUserId, 
            message: messageText 
        }]).then(({ error }) => {
            if (error) console.error("Database Error:", error);
        });
    }

    
    if (fileToProcess) {
        const tempFileId = "temp-" + Date.now();
        
        
        appendSingleMessage({
            id: tempFileId,
            sender_id: currentUser.id,
            message: `Uploading: ${fileToProcess.name}...`,
            isSending: true
        });

        
        handleBackgroundUpload(fileToProcess, tempFileId);
    }
}


async function handleBackgroundUpload(file, tempId) {
    try {
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        
        const { error: uploadError } = await _supabase.storage.from('chat-attachments').upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = _supabase.storage.from('chat-attachments').getPublicUrl(fileName);
        const isImg = ['jpg','jpeg','png','gif','webp'].includes(fileExt);
        const content = isImg ? `IMAGE_ATTACHMENT|${publicUrl}` : `FILE_ATTACHMENT|${file.name}|${publicUrl}`;
        
        
        await _supabase.from('messages').insert([{ 
            sender_id: currentUser.id, 
            receiver_id: selectedUserId, 
            message: content 
        }]);

        
        document.getElementById(`msg-${tempId}`)?.remove();
    } catch (err) {
        console.error("Background Upload Failed:", err);
        alert("Upload failed.");
        document.getElementById(`msg-${tempId}`)?.remove();
    }
}


window.triggerUpload = (id) => document.getElementById(id).click();

window.handleFileUpload = (input) => {
    const file = input.files[0];
    if (!file) return;
    pendingFile = file;
    const previewContainer = document.getElementById('attachmentPreview');
    const previewMedia = document.getElementById('previewMedia');
    const previewInfo = document.getElementById('previewInfo');
    
    if(previewInfo) previewInfo.innerText = file.name;
    if(previewContainer) previewContainer.style.display = 'block';

    if (file.type.startsWith('image/') && previewMedia) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewMedia.innerHTML = `<img src="${e.target.result}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">`;
        };
        reader.readAsDataURL(file);
    } else if (previewMedia) {
        previewMedia.innerHTML = `<i class="fa fa-file-pdf-o" style="font-size: 35px; color: #ef4444;"></i>`;
    }
};

window.clearPreview = () => {
    pendingFile = null;
    const container = document.getElementById('attachmentPreview');
    if(container) container.style.display = 'none';
    
    const fileInp = document.getElementById('fileAttachment');
    const imgInp = document.getElementById('imageAttachment');
    if(fileInp) fileInp.value = '';
    if(imgInp) imgInp.value = '';
};


window.initiateCall = async (type) => {
    if (!selectedUserId) return alert("Select a user first!");
    const roomId = `room_${Math.random().toString(36).slice(2, 9)}`;
    await _supabase.from('messages').insert([{
        sender_id: currentUser.id,
        receiver_id: selectedUserId,
        message: `CALL_REQUEST|${type}|${roomId}`
    }]);
    startAgoraSession(roomId, type);
};

async function startAgoraSession(roomId, type) {
    const container = document.getElementById('video-container');
    if(container) container.style.display = 'block';
    if(!client) return;
    try {
        await client.join(APP_ID, roomId, null, null);
        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        if (type === 'video') {
            localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
            localTracks.videoTrack.play('local-video');
            await client.publish([localTracks.audioTrack, localTracks.videoTrack]);
        } else {
            await client.publish([localTracks.audioTrack]);
        }
        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === "video") user.videoTrack.play("remote-video");
            if (mediaType === "audio") user.audioTrack.play();
        });
        client.on("user-left", leaveCall);
    } catch (e) { leaveCall(); }
}

window.leaveCall = async () => {
    for (let t in localTracks) if (localTracks[t]) { localTracks[t].stop(); localTracks[t].close(); }
    if (client) await client.leave();
    const container = document.getElementById('video-container');
    if(container) container.style.display = 'none';
};


function setupUIListeners() {
    const form = document.getElementById('messageForm');
    if (form) {
        form.onsubmit = sendMessage; 
    }

    window.toggleDropdown = () => document.getElementById('profileMenu')?.classList.toggle('show');
    window.toggleNotifPanel = () => {
        document.getElementById('notifPanel')?.classList.toggle('show');
        const b = document.getElementById('notif-badge');
        if(b) b.style.display = 'none';
    };

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-trigger')) document.getElementById('profileMenu')?.classList.remove('show');
        if (!e.target.closest('.notif-wrapper')) document.getElementById('notifPanel')?.classList.remove('show');
    });

    const searchInp = document.getElementById('userSearch');
    if (searchInp) {
        searchInp.oninput = () => {
            const term = searchInp.value.toLowerCase();
            renderConversationList(allEmployees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(term)));
        };
    }
}

function setupRealtimeSubscription() {
    _supabase.channel('hrms-chat')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                const msg = payload.new;
                if (msg.receiver_id === currentUser.id && msg.message.startsWith('CALL_REQUEST|')) {
                    const [_, type, roomId] = msg.message.split('|');
                    const caller = allEmployees.find(e => e.user_id === msg.sender_id);
                    if (confirm(`${caller?.first_name || "Someone"} is ${type} calling you. Accept?`)) startAgoraSession(roomId, type);
                    return;
                }
                if (msg.receiver_id === currentUser.id && msg.sender_id === selectedUserId) appendSingleMessage(msg);
            } else if (payload.eventType === 'DELETE') {
                document.getElementById(`msg-${payload.old.id}`)?.remove();
            }
        }).subscribe();
}


window.deleteMessage = async (id) => {
    if (confirm("Unsend message?")) {
        const { error } = await _supabase.from('messages').delete().eq('id', id).eq('sender_id', currentUser.id);
        if (!error) document.getElementById(`msg-${id}`)?.remove();
    }
};

window.insertEmoji = (emoji) => {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
};

function formatLastSeen(date) {
    if (!date) return "";
    const diff = Math.floor((new Date() - new Date(date)) / 60000);
    return diff < 1 ? "just now" : `${diff}m ago`;
}

async function updateRecruitmentBadge() {
    try {
        const { count } = await _supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
        const badge = document.getElementById('badge-count');
        if (badge && count > 0) { badge.innerText = count; badge.style.display = 'flex'; }
    } catch(e) {}
}

window.handleSignOut = async () => {
    await _supabase.from('employees').update({ status: 'offline' }).eq('user_id', currentUser.id);
    await _supabase.auth.signOut();
    window.location.href = "index.html";
};

document.addEventListener('DOMContentLoaded', init);