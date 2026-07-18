import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar, BarChart2, Users, FileSpreadsheet, 
  Weight, Flame, ChevronLeft, ChevronRight, Play, 
  Edit3, Trash2, Camera, Upload, Check, AlertCircle, 
  BookOpen, Info, Copy, Download, Sparkles, Feather,
  Cloud, Settings, Video, StopCircle, FileVideo, Save,
  Film
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

const customConfigStr = localStorage.getItem('buncholog_custom_firebase_config');
let app, auth, db, appId;
let initialSetupRequired = false;
let isUsingCustomFirebase = false;

try {
  let configToUse = null;
  if (customConfigStr) {
    configToUse = JSON.parse(customConfigStr);
    appId = 'custom-' + configToUse.projectId;
    isUsingCustomFirebase = true;
  } else if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    configToUse = JSON.parse(__firebase_config);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }

  if (configToUse && Object.keys(configToUse).length > 0) {
    app = initializeApp(configToUse);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    initialSetupRequired = true;
  }
} catch (e) {
  console.error("Firebase init failed:", e);
  initialSetupRequired = true;
}

const INITIAL_BIRDS = [];

const INITIAL_LOGS = {};

function BunchoAvatar({ variety, className = "w-16 h-16" }) {
  let headColor = '#475569';
  let cheekColor = '#FFFFFF';
  let beakColor = '#FB7185';
  let bodyColor = '#94A3B8';
  let backColor = '#F1F5F9';

  if (variety === 'white') {
    headColor = '#FFFFFF';
    cheekColor = '#FFF5F5';
    bodyColor = '#F8FAFC';
    backColor = '#E2E8F0';
  } else if (variety === 'sakura') {
    headColor = '#334155';
    cheekColor = '#FFFFFF';
    bodyColor = '#64748B';
    backColor = '#E2E8F0';
  } else if (variety === 'silver') {
    headColor = '#64748B';
    cheekColor = '#FFFFFF';
    bodyColor = '#CBD5E1';
    backColor = '#F1F5F9';
  } else if (variety === 'cinnamon') {
    headColor = '#78350F';
    cheekColor = '#FEF3C7';
    bodyColor = '#B45309';
    beakColor = '#FCA5A5';
    backColor = '#FEF3C7';
  } else if (variety === 'cream') {
    headColor = '#D97706';
    cheekColor = '#FFFBEB';
    bodyColor = '#FCD34D';
    beakColor = '#FDA4AF';
    backColor = '#FEF3C7';
  }

  return (
    <div className={`relative flex items-center justify-center rounded-full overflow-hidden border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="46" fill="none" stroke={beakColor} strokeWidth="1" strokeDasharray="2,2" />
        <ellipse cx="50" cy="65" rx="30" ry="25" fill={bodyColor} />
        <circle cx="50" cy="38" r="22" fill={headColor} />
        {variety !== 'white' && (
          <>
            <ellipse cx="34" cy="42" rx="10" ry="7" fill={cheekColor} transform="rotate(-10 34 42)" />
            <ellipse cx="66" cy="42" rx="10" ry="7" fill={cheekColor} transform="rotate(10 66 42)" />
          </>
        )}
        <polygon points="42,38 58,38 50,56" fill={beakColor} />
        <polygon points="45,38 55,38 50,44" fill="#F43F5E" opacity="0.4" />
        <circle cx="34" cy="34" r="4.5" fill="#FDA4AF" />
        <circle cx="34" cy="34" r="3" fill="#1E293B" />
        <circle cx="33" cy="33" r="1" fill="#FFFFFF" />
        <circle cx="66" cy="34" r="4.5" fill="#FDA4AF" />
        <circle cx="66" cy="34" r="3" fill="#1E293B" />
        <circle cx="65" cy="33" r="1" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [birds, setBirds] = useState([]);
  const [logs, setLogs] = useState({});
  const [activeBirdId, setActiveBirdId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState('');
  const [logWeight, setLogWeight] = useState('');
  const [logFood, setLogFood] = useState('');
  const [logPoop, setLogPoop] = useState('normal');
  const [logMoltEvent, setLogMoltEvent] = useState('');
  const [logVideoUrls, setLogVideoUrls] = useState([]); // Multiple videos array
  const [newVideoUrlInput, setNewVideoUrlInput] = useState(''); // Manual URL input
  const [logMemo, setLogMemo] = useState('');

  const [isBirdModalOpen, setIsBirdModalOpen] = useState(false);
  const [editingBird, setEditingBird] = useState(null);
  const [birdName, setBirdName] = useState('');
  const [birdVariety, setBirdVariety] = useState('white');
  const [birdGender, setBirdGender] = useState('male');
  const [birdBirthday, setBirdBirthday] = useState('');
  const [birdTargetWeight, setBirdTargetWeight] = useState('');
  const [birdMemo, setBirdMemo] = useState('');

  const [youtubeConfig, setYoutubeConfig] = useState({ clientId: '', apiKey: '' });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempYoutubeConfig, setTempYoutubeConfig] = useState({ clientId: '', apiKey: '' });

  const [graphRange, setGraphRange] = useState('1M');

  const [isUploadingMock, setIsUploadingMock] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState(null);

  // Custom Dialog States
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Swipe Action States
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Custom Firebase Setup States
  const [firebaseSetupInput, setFirebaseSetupInput] = useState('');
  const [firebaseSetupError, setFirebaseSetupError] = useState('');
  const [tempFirebaseInput, setTempFirebaseInput] = useState(
    customConfigStr ? JSON.stringify(JSON.parse(customConfigStr), null, 2) : ''
  );

  const saveCustomFirebaseConfig = (inputStr) => {
    try {
      let cleanStr = inputStr.trim();
      // 余分な文字列(const firebaseConfig = ...等)が含まれていてもオブジェクト部分のみ抽出
      const match = cleanStr.match(/\{[\s\S]*\}/);
      if (match) cleanStr = match[0];
      
      // JSオブジェクトリテラル風の入力を標準JSON形式に補正
      cleanStr = cleanStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');

      const parsed = JSON.parse(cleanStr);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error("apiKey や projectId が含まれていません。");
      }
      localStorage.setItem('buncholog_custom_firebase_config', JSON.stringify(parsed));
      window.location.reload(); // 設定適用のためリロード
    } catch (err) {
      return "正しいJSON形式で入力してください。\n" + err.message;
    }
    return null;
  };

  const handleInitialSetupSubmit = () => {
    const error = saveCustomFirebaseConfig(firebaseSetupInput);
    if (error) setFirebaseSetupError(error);
  };

  const clearCustomFirebaseConfig = () => {
    localStorage.removeItem('buncholog_custom_firebase_config');
    window.location.reload();
  };

  const birdsMigrationChecked = useRef(false);
  const logsMigrationChecked = useRef(false);

  // Load Google Identity Services Script for OAuth
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // 1. Setup Auth
  useEffect(() => {
    if (initialSetupRequired || !auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && !isUsingCustomFirebase) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, [initialSetupRequired]);

  // 2. Fetch Data
  useEffect(() => {
    if (!user || initialSetupRequired || !db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Load Settings
    let unsubSettings = () => {};
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'settings', 'youtube');
      unsubSettings = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          setYoutubeConfig(snapshot.data());
        }
      });
    } catch(e) {
      console.warn("Settings load error", e);
    }

    const birdsRef = collection(db, 'artifacts', appId, 'birds');
    const unsubBirds = onSnapshot(birdsRef, async (snapshot) => {
      if (snapshot.empty && !birdsMigrationChecked.current) {
        birdsMigrationChecked.current = true;
        const localBirds = localStorage.getItem('buncholog_birds');
        const dataToSeed = localBirds ? JSON.parse(localBirds) : INITIAL_BIRDS;
        for (const b of dataToSeed) {
          await setDoc(doc(db, 'artifacts', appId, 'birds', b.id), b);
        }
      } else {
        birdsMigrationChecked.current = true;
        const fetchedBirds = snapshot.docs.map(d => d.data());
        setBirds(fetchedBirds);
        if (fetchedBirds.length > 0) {
          setActiveBirdId(prev => fetchedBirds.some(b => b.id === prev) ? prev : fetchedBirds[0].id);
        }
      }
    }, (err) => console.error(err));

    const logsRef = collection(db, 'artifacts', appId, 'logs');
    const unsubLogs = onSnapshot(logsRef, async (snapshot) => {
      if (snapshot.empty && !logsMigrationChecked.current) {
        logsMigrationChecked.current = true;
        const localLogs = localStorage.getItem('buncholog_logs');
        const dataToSeed = localLogs ? JSON.parse(localLogs) : INITIAL_LOGS;
        
        for (const birdId in dataToSeed) {
          for (const log of dataToSeed[birdId]) {
            const logId = `${birdId}_${log.date}`;
            await setDoc(doc(db, 'artifacts', appId, 'logs', logId), {
              ...log, id: logId, birdId
            });
          }
        }
        setIsLoading(false);
      } else {
        logsMigrationChecked.current = true;
        const fetchedLogs = snapshot.docs.map(d => d.data());
        const newLogsObj = {};
        fetchedLogs.forEach(log => {
          if (!newLogsObj[log.birdId]) newLogsObj[log.birdId] = [];
          newLogsObj[log.birdId].push(log);
        });
        for (const key in newLogsObj) {
          newLogsObj[key].sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        setLogs(newLogsObj);
        setIsLoading(false);
      }
    }, (err) => {
      console.error(err);
      setIsLoading(false);
    });

    return () => {
      unsubSettings();
      unsubBirds();
      unsubLogs();
    };
  }, [user]);

  const activeBird = birds.find(b => b.id === activeBirdId) || birds[0];
  const activeBirdLogs = logs[activeBirdId] || [];

  const getMoltingHistory = (birdLogs) => {
    const sorted = [...birdLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const history = {};
    let molting = false;
    sorted.forEach(log => {
      if (log.moltEvent === 'start') molting = true;
      history[log.date] = { isMolting: molting, moltEvent: log.moltEvent };
      if (log.moltEvent === 'end') molting = false;
    });
    return { history, currentlyMolting: molting };
  };

  const { currentlyMolting } = getMoltingHistory(activeBirdLogs);

  const getMoltingStatusOnDate = (dateStr) => {
    const sortedPastLogs = [...activeBirdLogs]
      .filter(l => l.date <= dateStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let molting = false;
    sortedPastLogs.forEach(log => {
      if (log.moltEvent === 'start') molting = true;
      if (log.moltEvent === 'end') molting = false;
    });
    return molting;
  };

  const handleYoutubeUpload = async (fileBlob) => {
    if (!youtubeConfig.clientId) {
      setAlertMessage('YouTube連携が設定されていません。\n右上の「設定アイコン」からクライアントIDを登録してください。');
      return;
    }

    if (typeof google === 'undefined' || !google.accounts) {
      setAlertMessage('Google認証ライブラリを読み込み中です。数秒待ってから再度お試しください。');
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: youtubeConfig.clientId,
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      callback: (response) => {
        if (response.error !== undefined) {
          setAlertMessage('認証に失敗しました: ' + response.error);
          return;
        }
        
        setIsUploadingMock(true);
        setUploadProgress(0);
        
        try {
          const accessToken = response.access_token;
          const metadata = {
            snippet: {
              title: `${activeBird?.name}の記録 - ${selectedLogDate}`,
              description: 'BUNCHOLOGアプリからアップロードされた健康記録動画です。',
              categoryId: 22 
            },
            status: {
              privacyStatus: 'unlisted' 
            }
          };

          const initXhr = new XMLHttpRequest();
          initXhr.open('POST', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status');
          initXhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          initXhr.setRequestHeader('Content-Type', 'application/json');
          
          initXhr.onload = () => {
            if (initXhr.status === 200) {
              const uploadUrl = initXhr.getResponseHeader('Location');
              const uploadXhr = new XMLHttpRequest();
              uploadXhr.open('PUT', uploadUrl);
              
              uploadXhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100);
                  setUploadProgress(percentComplete);
                }
              };

              uploadXhr.onload = () => {
                if (uploadXhr.status === 200 || uploadXhr.status === 201) {
                  const responseData = JSON.parse(uploadXhr.responseText);
                  const uploadedUrl = `https://www.youtube.com/watch?v=${responseData.id}`;
                  setLogVideoUrls(prev => [...prev, uploadedUrl]);
                  setAlertMessage('YouTubeへのアップロードが完了しました！\n動画の処理が終わるまで再生できない場合があります。');
                  setSelectedFileForUpload(null);
                } else {
                  setAlertMessage('動画本体のアップロードエラー: ' + uploadXhr.responseText);
                }
                setIsUploadingMock(false);
              };
              
              uploadXhr.onerror = () => {
                setAlertMessage('動画のアップロード中に通信エラーが発生しました。');
                setIsUploadingMock(false);
              };

              uploadXhr.send(fileBlob);
            } else {
              setAlertMessage('アップロードの初期化に失敗しました: ' + initXhr.responseText);
              setIsUploadingMock(false);
            }
          };
          
          initXhr.onerror = () => {
            setAlertMessage('YouTube APIとの通信エラーが発生しました。');
            setIsUploadingMock(false);
          };

          initXhr.send(JSON.stringify(metadata));
          
        } catch (error) {
          setAlertMessage('予期せぬエラーが発生しました: ' + error.message);
          setIsUploadingMock(false);
        }
      },
    });

    client.requestAccessToken();
  };

  const openLogModal = (dateStr = '') => {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const existingLog = activeBirdLogs.find(l => l.date === todayStr);

    setSelectedLogDate(todayStr);
    if (existingLog) {
      setLogWeight(existingLog.weight || '');
      setLogFood(existingLog.food || '');
      setLogPoop(existingLog.poop || 'normal');
      setLogMoltEvent(existingLog.moltEvent || '');
      
      let urls = [];
      if (existingLog.videoUrls && Array.isArray(existingLog.videoUrls)) {
        urls = [...existingLog.videoUrls];
      } else if (existingLog.videoUrl) {
        urls = [existingLog.videoUrl];
      }
      setLogVideoUrls(urls);
      setNewVideoUrlInput('');
      setLogMemo(existingLog.memo || '');
    } else {
      setLogWeight('');
      setLogFood('');
      setLogPoop('normal');
      setLogMoltEvent('');
      setLogVideoUrls([]);
      setNewVideoUrlInput('');
      setLogMemo('');
    }
    setSelectedFileForUpload(null);
    setIsLogModalOpen(true);
  };

  const saveLog = async (e) => {
    e.preventDefault();
    if (!selectedLogDate || !user) return;

    const currentlyMoltingBeforeThisDate = getMoltingStatusOnDate(selectedLogDate);
    const existingForThisDate = activeBirdLogs.find(l => l.date === selectedLogDate);
    const currentMoltEvent = existingForThisDate?.moltEvent || '';

    if (logMoltEvent === 'start') {
      if (currentlyMoltingBeforeThisDate && currentMoltEvent !== 'start') {
        setAlertMessage("すでに換羽期が開始されています。\n先に「終了」を記録するか、ステータスを確認してください。");
        return;
      }
    }
    if (logMoltEvent === 'end') {
      if (!currentlyMoltingBeforeThisDate && currentMoltEvent !== 'end') {
        setAlertMessage("換羽が開始されていません。\n先に「開始」を記録してください。");
        return;
      }
    }

    const logId = `${activeBirdId}_${selectedLogDate}`;
    const newLogEntry = {
      id: logId,
      birdId: activeBirdId,
      date: selectedLogDate,
      weight: logWeight ? parseFloat(logWeight) : null,
      food: logFood ? parseFloat(logFood) : null,
      poop: logPoop,
      moltEvent: logMoltEvent,
      videoUrl: logVideoUrls.length > 0 ? logVideoUrls[0] : '', // for backward compatibility
      videoUrls: logVideoUrls,
      memo: logMemo
    };

    const docRef = doc(db, 'artifacts', appId, 'logs', logId);
    await setDoc(docRef, newLogEntry);
    
    setIsLogModalOpen(false);
  };

  const deleteLog = (dateStr) => {
    setConfirmAction(() => async () => {
      if (!user) return;
      const logId = `${activeBirdId}_${dateStr}`;
      await deleteDoc(doc(db, 'artifacts', appId, 'logs', logId));
      setIsLogModalOpen(false);
    });
    setConfirmMessage(`${dateStr} の記録を削除しますか？\nこの操作は元に戻せません。`);
  };

  const openBirdModal = (bird = null) => {
    if (bird) {
      setEditingBird(bird);
      setBirdName(bird.name);
      setBirdVariety(bird.variety);
      setBirdGender(bird.gender);
      setBirdBirthday(bird.birthday);
      setBirdTargetWeight(bird.targetWeight || '');
      setBirdMemo(bird.memo || '');
    } else {
      setEditingBird(null);
      setBirdName('');
      setBirdVariety('white');
      setBirdGender('male');
      setBirdBirthday('');
      setBirdTargetWeight('');
      setBirdMemo('');
    }
    setIsBirdModalOpen(true);
  };

  const saveBirdProfile = async (e) => {
    e.preventDefault();
    if (!birdName.trim() || !user) return;

    const birdId = editingBird ? editingBird.id : `b_${Date.now()}`;
    const birdData = {
      id: birdId,
      name: birdName,
      variety: birdVariety,
      gender: birdGender,
      birthday: birdBirthday,
      targetWeight: birdTargetWeight ? parseFloat(birdTargetWeight) : null,
      memo: birdMemo
    };

    await setDoc(doc(db, 'artifacts', appId, 'birds', birdId), birdData);
    if (!editingBird) setActiveBirdId(birdId);
    setIsBirdModalOpen(false);
  };

  const deleteBirdProfile = (id) => {
    if (birds.length <= 1) {
      setAlertMessage("最後の1羽は削除できません。");
      return;
    }
    setConfirmAction(() => async () => {
      if (!user) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'birds', id));
      
      const logsToDelete = logs[id] || [];
      for (const log of logsToDelete) {
        await deleteDoc(doc(db, 'artifacts', appId, 'logs', log.id));
      }
    });
    setConfirmMessage("この文鳥のプロフィールとすべての記録を削除しますか？\nこの操作は取り消せません。");
  };

  const saveSettings = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'settings', 'youtube'), tempYoutubeConfig);
    setIsSettingsModalOpen(false);
    setAlertMessage("API設定をデータベース(Firestore)に保存しました。");
  };

  const getFilteredLogs = () => {
    const sorted = [...activeBirdLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length === 0) return [];
    if (graphRange === 'ALL') return sorted;

    const now = new Date();
    let cutoff = new Date();
    if (graphRange === '1W') cutoff.setDate(now.getDate() - 7);
    else if (graphRange === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (graphRange === '3M') cutoff.setMonth(now.getMonth() - 3);

    return sorted.filter(l => new Date(l.date) >= cutoff);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = activeBirdLogs.find(l => l.date === todayStr);
  const latestWeight = activeBirdLogs.length > 0 
    ? [...activeBirdLogs].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight 
    : null;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || birds.length <= 1) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    
    // 縦スクロールと誤認しないための判定（Y方向の移動量が多ければ無視）
    if (distanceY > Math.abs(distanceX)) return;

    // スワイプ判定のしきい値(px)
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = birds.findIndex(b => b.id === activeBirdId);
      if (currentIndex === -1) return;

      if (isLeftSwipe) {
        // 次の文鳥へ（最後なら最初に戻る）
        const nextIndex = (currentIndex + 1) % birds.length;
        setActiveBirdId(birds[nextIndex].id);
      } else if (isRightSwipe) {
        // 前の文鳥へ（最初なら最後に戻る）
        const prevIndex = (currentIndex - 1 + birds.length) % birds.length;
        setActiveBirdId(birds[prevIndex].id);
      }
    }
  };

  const extractYouTubeId = (url) => {
    // ShortsのURL形式（/shorts/）にも対応した正規表現に更新
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : false;
  };

  const renderVideoGallery = () => {
    const videoList = [];
    activeBirdLogs.forEach(log => {
      let urls = [];
      if (log.videoUrls && log.videoUrls.length > 0) {
        urls = log.videoUrls;
      } else if (log.videoUrl) {
        urls = [log.videoUrl];
      }
      
      urls.forEach((url, index) => {
        videoList.push({
          date: log.date,
          url: url,
          memo: log.memo,
          id: `${log.id}_${index}`
        });
      });
    });

    videoList.sort((a, b) => new Date(b.date) - new Date(a.date));

    const grouped = {};
    videoList.forEach(v => {
      const month = v.date.substring(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(v);
    });

    if (Object.keys(grouped).length === 0) {
      return (
        <div className="bg-white p-10 rounded-2xl border border-rose-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
          <Film className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-bold">登録されている動画がありません。</p>
          <p className="text-xs text-slate-400 mt-1">日々の記録にYouTube動画を追加すると、ここにギャラリーとして表示されます。</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([month, videos]) => {
          const [y, m] = month.split('-');
          return (
            <div key={month} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
              <h4 className="font-extrabold text-slate-800 border-b border-rose-100 pb-2 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400" />
                {y}年 {parseInt(m, 10)}月
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {videos.map(video => {
                  const videoId = extractYouTubeId(video.url);
                  const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
                  
                  return (
                    <div key={video.id} onClick={() => window.open(video.url, '_blank')} className="cursor-pointer group flex flex-col gap-1.5">
                      <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video shadow-sm border border-slate-200 group-hover:border-rose-400 transition-colors">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="thumbnail" className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Play className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                             <Play className="w-5 h-5 fill-white text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold backdrop-blur-sm shadow-sm">
                          {video.date.substring(5).replace('-', '/')}
                        </div>
                      </div>
                      {video.memo && <p className="text-[9px] text-slate-500 line-clamp-2 leading-tight px-0.5">{video.memo}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInteractiveCharts = () => {
    const chartData = getFilteredLogs().filter(l => l.weight !== null || l.food !== null);
    if (chartData.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
          <BarChart2 className="w-12 h-12 text-slate-300 mb-2" />
          <p className="font-medium text-sm">グラフ表示に必要なデータが不足しています</p>
          <p className="text-xs text-slate-400 mt-1">記録を追加すると、体重とごはんの推移が美しいグラフで可視化されます。</p>
          <button onClick={() => openLogModal()} className="mt-4 px-4 py-2 bg-rose-400 text-white rounded-full text-xs font-semibold shadow hover:bg-rose-500 transition-colors flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> 記録を追加する
          </button>
        </div>
      );
    }

    const width = 600;
    const height = 240;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 30;
    const paddingBottom = 40;

    const weights = chartData.map(d => d.weight).filter(w => w !== null && w !== undefined);
    const foods = chartData.map(d => d.food).filter(f => f !== null && f !== undefined);

    const minWeight = Math.min(...weights, activeBird?.targetWeight || 24) - 1;
    const maxWeight = Math.max(...weights, activeBird?.targetWeight || 25) + 1;
    const maxFood = Math.max(...foods, 5) + 1;

    const getX = (index) => paddingLeft + index * ((width - paddingLeft - paddingRight) / (chartData.length - 1 || 1));
    const getYWeight = (val) => val === null || val === undefined ? null : height - paddingBottom - (val - minWeight) * ((height - paddingTop - paddingBottom) / (maxWeight - minWeight));
    const getYFood = (val) => val === null || val === undefined ? null : height - paddingBottom - val * ((height - paddingTop - paddingBottom) / maxFood);

    let weightPath = '';
    let foodAreaPath = '';
    let foodLinePath = '';

    chartData.forEach((d, i) => {
      const x = getX(i);
      const yW = getYWeight(d.weight);
      if (yW !== null) {
        weightPath += weightPath === '' ? `M ${x} ${yW}` : ` L ${x} ${yW}`;
      }
      const yF = getYFood(d.food);
      if (yF !== null) {
        if (foodLinePath === '') {
          foodLinePath = `M ${x} ${yF}`;
          foodAreaPath = `M ${x} ${height - paddingBottom} L ${x} ${yF}`;
        } else {
          foodLinePath += ` L ${x} ${yF}`;
          foodAreaPath += ` L ${x} ${yF}`;
        }
        if (i === chartData.length - 1) foodAreaPath += ` L ${x} ${height - paddingBottom} Z`;
      }
    });

    const targetY = getYWeight(activeBird?.targetWeight);

    return (
      <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><BarChart2 className="w-4 h-4 text-rose-400" />体重・食事量推移</h3>
          <div className="flex gap-2 text-xs bg-slate-100 p-1 rounded-lg">
            {['1W', '1M', '3M', 'ALL'].map((r) => (
              <button key={r} onClick={() => setGraphRange(r)} className={`px-2.5 py-1 rounded-md font-semibold transition-all ${graphRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {r === '1W' ? '1週間' : r === '1M' ? '1ヶ月' : r === '3M' ? '3ヶ月' : '全期間'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs mb-3 text-slate-500">
          <div className="flex items-center gap-1.5"><span className="w-3 h-1 bg-rose-400 rounded-full inline-block"></span><span>体重 (g)</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-amber-200/60 border border-amber-300 rounded-sm inline-block"></span><span>ごはん (g)</span></div>
          {activeBird?.targetWeight && (
            <div className="flex items-center gap-1.5"><span className="w-3 h-0 border-t border-dashed border-emerald-400 inline-block"></span><span>目標体重 ({activeBird.targetWeight}g)</span></div>
          )}
        </div>

        <div className="relative w-full overflow-x-auto" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = paddingTop + p * (height - paddingTop - paddingBottom);
              return <line key={i} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#F1F5F9" strokeWidth="1" />;
            })}
            {chartData.map((d, i) => {
              const x = getX(i);
              const showLabel = chartData.length <= 10 || i % Math.ceil(chartData.length / 7) === 0 || i === chartData.length - 1;
              if (!showLabel) return null;
              const dateObj = new Date(d.date);
              return <text key={i} x={x} y={height - paddingBottom + 16} textAnchor="middle" fill="#94A3B8" className="text-[9px] font-medium">{`${dateObj.getMonth() + 1}/${dateObj.getDate()}`}</text>;
            })}
            <text x={paddingLeft - 8} y={paddingTop - 5} textAnchor="end" fill="#F43F5E" className="text-[9px] font-bold">g (体重)</text>
            {[minWeight, (minWeight + maxWeight) / 2, maxWeight].map((val, i) => (
              <text key={i} x={paddingLeft - 8} y={getYWeight(val) + 3} textAnchor="end" fill="#E11D48" className="text-[9px] font-medium">{val.toFixed(1)}</text>
            ))}
            <text x={width - paddingRight + 8} y={paddingTop - 5} textAnchor="start" fill="#D97706" className="text-[9px] font-bold">g (ごはん)</text>
            {[0, maxFood / 2, maxFood].map((val, i) => (
              <text key={i} x={width - paddingRight + 8} y={getYFood(val) + 3} textAnchor="start" fill="#D97706" className="text-[9px] font-medium">{val.toFixed(1)}</text>
            ))}
            {activeBird?.targetWeight && targetY && <line x1={paddingLeft} y1={targetY} x2={width - paddingRight} y2={targetY} stroke="#34D399" strokeDasharray="4,4" strokeWidth="1.5" />}
            {foodAreaPath && <path d={foodAreaPath} fill="url(#food-gradient)" opacity="0.4" />}
            {foodLinePath && <path d={foodLinePath} fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />}
            {weightPath && <path d={weightPath} fill="none" stroke="#FB7185" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            {chartData.map((d, i) => {
              const x = getX(i);
              const yW = getYWeight(d.weight);
              const yF = getYFood(d.food);
              return (
                <g key={i} className="group cursor-pointer">
                  {yF !== null && <circle cx={x} cy={yF} r="4" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.5" />}
                  {yW !== null && <circle cx={x} cy={yW} r="5" fill="#E11D48" stroke="#FFFFFF" strokeWidth="2" />}
                </g>
              );
            })}
            <defs>
              <linearGradient id="food-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = Array(firstDayIndex).fill(null).concat(Array.from({ length: totalDays }, (_, i) => i + 1));

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-rose-50/50 border-b border-rose-100">
          <button onClick={prevMonth} className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-rose-500" /></button>
          <h3 className="font-bold text-slate-800 text-base">{year}年 {month + 1}月</h3>
          <button onClick={nextMonth} className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-rose-500" /></button>
        </div>
        <div className="grid grid-cols-7 text-center py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500">
          <span className="text-rose-500">日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span className="text-blue-500">土</span>
        </div>
        <div className="grid grid-cols-7 border-collapse">
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="border-b border-r border-slate-50 min-h-[90px] bg-slate-50/30" />;
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = activeBirdLogs.find(l => l.date === dayStr);
            const isMolting = getMoltingStatusOnDate(dayStr);

            return (
              <div key={dayStr} onClick={() => openLogModal(dayStr)} className={`border-b border-r border-slate-100 min-h-[95px] p-1.5 flex flex-col justify-between cursor-pointer hover:bg-rose-50/40 transition-colors relative ${log ? 'bg-amber-50/10' : ''}`}>
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold ${idx % 7 === 0 ? 'text-rose-500' : idx % 7 === 6 ? 'text-blue-500' : 'text-slate-700'}`}>{day}</span>
                  <div className="flex gap-0.5">
                    {isMolting && <span className="p-0.5 bg-amber-100 rounded-full text-amber-600 shadow-sm" title="換羽期"><Feather className="w-3 h-3 fill-amber-300" /></span>}
                    {log?.memo && <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" title="メモあり" />}
                  </div>
                </div>
                <div className="mt-1 space-y-0.5 text-[10px] font-medium text-slate-600">
                  {log?.weight && <div className="flex items-center gap-0.5 text-rose-500"><Weight className="w-2.5 h-2.5" /><span>{log.weight}g</span></div>}
                  {log?.food && <div className="flex items-center gap-0.5 text-amber-600"><Flame className="w-2.5 h-2.5" /><span>{log.food}g</span></div>}
                  {log?.poop && <div className="text-[9px] px-1 py-0.2 rounded inline-block font-semibold bg-slate-100 text-slate-500">💩 {log.poop === 'many' ? '多' : log.poop === 'few' ? '少' : '並'}</div>}
                </div>
                {((log?.videoUrls && log.videoUrls.length > 0) || log?.videoUrl) && (
                  <button onClick={(e) => { 
                    e.stopPropagation(); 
                    const urlToOpen = (log.videoUrls && log.videoUrls.length > 0) ? log.videoUrls[0] : log.videoUrl;
                    window.open(urlToOpen, '_blank'); 
                  }} className="absolute bottom-1 right-1 p-1 bg-red-100 hover:bg-red-200 rounded-full text-red-600 transition-colors shadow-sm" title="最初の動画を再生する">
                    <Play className="w-2.5 h-2.5 fill-red-600" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const exportToCSV = () => {
    if (!activeBird) return '';
    const headers = ['日付', '名前', '品種', '体重(g)', 'ごはん消費量(g)', 'うんちの量', '換羽ステータス', 'メモ', '記録動画URL'];
    const rows = activeBirdLogs.map(log => [
      log.date, activeBird.name, activeBird.variety, log.weight || '', log.food || '',
      log.poop === 'many' ? '多い' : log.poop === 'few' ? '少ない' : '普通',
      log.moltEvent === 'start' ? '換羽開始' : log.moltEvent === 'end' ? '換羽終了' : getMoltingStatusOnDate(log.date) ? '換羽中' : '',
      log.memo || '', 
      (log.videoUrls && log.videoUrls.length > 0) ? log.videoUrls.join(' | ') : (log.videoUrl || '')
    ]);
    return [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
  };

  const copyCSVToClipboard = () => {
    const csv = exportToCSV();
    const textArea = document.createElement("textarea");
    textArea.value = csv;
    
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setAlertMessage("CSVデータをクリップボードにコピーしました！\nGoogleスプレッドシートを開き、セルを1つ選択して「貼り付け」をすると簡単にデータを移行できます。");
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      setAlertMessage("コピーに失敗しました。お手数ですが、下のテキストエリアから手動でコピーしてください。");
    }
    
    document.body.removeChild(textArea);
  };

  const downloadCSVFile = () => {
    if (!activeBird) return;
    const csv = exportToCSV();
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeBird.name}_健康ログ_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        if (lines.length < 2) throw new Error("データがありません");

        const parseCSVLine = (line) => {
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          return line.split(regex).map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
        };

        const newBirds = [];
        let importCount = 0;

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = parseCSVLine(lines[i]);
          if (cols.length < 9) continue;

          const [date, name, varietyStr, weightStr, foodStr, poopStr, moltStr, memo, videoUrlStr] = cols;
          if (!date || !name) continue;

          let bird = birds.find(b => b.name === name) || newBirds.find(b => b.name === name);
          if (!bird) {
            const variety = varietyStr === '桜文鳥' ? 'sakura' : varietyStr === 'シルバー文鳥' ? 'silver' : varietyStr === 'シナモン文鳥' ? 'cinnamon' : varietyStr === 'クリーム文鳥' ? 'cream' : 'white';
            bird = {
              id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: name,
              variety: variety,
              gender: 'unknown',
              birthday: '',
              targetWeight: null,
              memo: 'CSVからインポートされました'
            };
            newBirds.push(bird);
            await setDoc(doc(db, 'artifacts', appId, 'birds', bird.id), bird);
          }

          const logId = `${bird.id}_${date}`;
          const videoUrls = videoUrlStr ? videoUrlStr.split(' | ').map(u => u.trim()).filter(Boolean) : [];
          
          const newLog = {
            id: logId,
            birdId: bird.id,
            date: date,
            weight: weightStr ? parseFloat(weightStr) : null,
            food: foodStr ? parseFloat(foodStr) : null,
            poop: poopStr === '多い' ? 'many' : poopStr === '少ない' ? 'few' : 'normal',
            moltEvent: moltStr === '換羽開始' ? 'start' : moltStr === '換羽終了' ? 'end' : '',
            memo: memo || '',
            videoUrls: videoUrls,
            videoUrl: videoUrls.length > 0 ? videoUrls[0] : ''
          };

          await setDoc(doc(db, 'artifacts', appId, 'logs', logId), newLog);
          importCount++;
        }
        
        setAlertMessage(`CSVのインポートが完了しました！\n${importCount}件の記録を取り込みました。`);
        event.target.value = '';
      } catch (err) {
        setAlertMessage("CSVの読み込みに失敗しました。\n正しいフォーマットのファイルを選択してください。");
        console.error(err);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (initialSetupRequired) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4 text-slate-800 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full space-y-6 border border-rose-100">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">データベースの設定</h1>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              BUNCHOLOGを利用するには、データの保存先となるFirebaseプロジェクトの設定が必要です。Firebaseコンソールから設定情報をコピーして貼り付けてください。
            </p>
          </div>
          
          {firebaseSetupError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold whitespace-pre-wrap border border-red-100">
              {firebaseSetupError}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Firebase Config</label>
            <textarea 
              value={firebaseSetupInput}
              onChange={(e) => setFirebaseSetupInput(e.target.value)}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "...",\n  ...\n}`}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono h-40"
            />
          </div>

          <button 
            onClick={handleInitialSetupSubmit}
            className="w-full py-3.5 bg-rose-500 text-white rounded-xl text-sm font-extrabold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            設定してはじめる
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-rose-50 flex items-center justify-center text-rose-500 font-bold"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/20 to-amber-50/20 text-slate-800 font-sans pb-16 relative">
      
      {alertMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="mx-auto bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <Info className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">{alertMessage}</p>
            <button onClick={() => setAlertMessage('')} className="w-full py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors shadow-sm">OK</button>
          </div>
        </div>
      )}

      {confirmMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="mx-auto bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-sm font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">{confirmMessage}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setConfirmMessage(''); setConfirmAction(null); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">キャンセル</button>
              <button onClick={() => { if(confirmAction) confirmAction(); setConfirmMessage(''); setConfirmAction(null); }} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors shadow-sm">実行する</button>
            </div>
          </div>
        </div>
      )}

      {/* API Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-rose-50 my-8">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-extrabold text-base flex items-center gap-1.5"><Settings className="w-4 h-4" />アプリ設定</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-white hover:text-slate-300 font-bold">✕</button>
            </div>
            <div className="p-5 space-y-8">
              
              {/* YouTube設定セクション */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Video className="w-4 h-4 text-rose-500" /> YouTube連携設定
                </h4>
                <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100 leading-relaxed">
                  <p className="font-bold mb-1">YouTubeへ動画を直接アップロード</p>
                  <p>ご自身のGoogle Cloudプロジェクトで「YouTube Data API v3」を有効にし、「OAuth 2.0 クライアント ID」を設定してください。</p>
                </div>
                
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">現在のJavaScript生成元 (Origin)</p>
                  <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 p-2 rounded-lg shadow-inner">
                    <span className="text-[10px] text-slate-600 font-mono overflow-x-auto whitespace-nowrap">{window.location.origin}</span>
                    <button type="button" onClick={() => {
                      const textArea = document.createElement("textarea");
                      textArea.value = window.location.origin;
                      textArea.style.position = "fixed";
                      textArea.style.left = "-999999px";
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        setAlertMessage("JavaScript生成元をコピーしました。\nGoogle Cloud Consoleの「承認済みの JavaScript 生成元」に貼り付けて保存してください。");
                      } catch (e) {
                        setAlertMessage("URLのコピーに失敗しました。お手数ですが手動でコピーしてください。");
                      }
                      document.body.removeChild(textArea);
                    }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors shrink-0" title="URLをコピー">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">OAuth 2.0 クライアント ID</label>
                  <input 
                    type="text" 
                    placeholder="xxxx-yyyy.apps.googleusercontent.com" 
                    value={tempYoutubeConfig.clientId} 
                    onChange={(e) => setTempYoutubeConfig({...tempYoutubeConfig, clientId: e.target.value})} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" 
                  />
                </div>

                <button onClick={saveSettings} className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-extrabold hover:bg-slate-900 transition-all flex items-center justify-center gap-1 shadow-lg shadow-slate-200">
                  <Save className="w-4 h-4" /><span>YouTube設定を保存</span>
                </button>
              </div>

              {/* Firebase設定セクション */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Cloud className="w-4 h-4 text-rose-500" /> データ保存先 (Firebase)
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  {isUsingCustomFirebase ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">カスタム設定適用中</span>
                      <button onClick={clearCustomFirebaseConfig} className="text-[10px] px-2 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded font-bold transition-colors">デフォルトに戻す</button>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block border border-slate-200">デフォルト設定適用中</div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">カスタム Firebase Config (JSON)</label>
                    <textarea 
                      value={tempFirebaseInput}
                      onChange={(e) => setTempFirebaseInput(e.target.value)}
                      placeholder={`{\n  "apiKey": "AIzaSy...",\n  "projectId": "..."\n}`}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono h-28"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (!tempFirebaseInput.trim()) return;
                      const error = saveCustomFirebaseConfig(tempFirebaseInput);
                      if (error) setAlertMessage(error);
                    }}
                    className="w-full py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    設定を更新して再読み込み
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Top Banner App bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-rose-100/60 shadow-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-400 p-2 rounded-xl text-white shadow-md shadow-rose-300">
              <Sparkles className="w-5 h-5 fill-rose-50" />
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-wider text-rose-500">BUNCHOLOG</h1>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">文鳥ヘルスケアパートナー</p>
            </div>
          </div>

          {birds.length > 0 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setTempYoutubeConfig(youtubeConfig); setIsSettingsModalOpen(true); }}
                className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                title="API連携設定"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="relative ml-1">
                <select
                  value={activeBirdId}
                  onChange={(e) => setActiveBirdId(e.target.value)}
                  className="pl-8 pr-8 py-1.5 rounded-full text-xs font-bold border border-rose-200 bg-rose-50/40 text-slate-700 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all"
                >
                  {birds.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                  <BunchoAvatar variety={activeBird?.variety} className="w-5 h-5 border-none bg-none" />
                </div>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              <button 
                onClick={() => openLogModal()}
                className="p-1.5 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 transition-transform active:scale-95"
                title="本日の記録を追加"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {}
      {birds.length === 0 ? (
        <main className="max-w-4xl mx-auto px-4 pt-12 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Feather className="w-10 h-10 text-rose-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">BUNCHOLOGへようこそ！</h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              まずは、あなたの愛する文鳥のプロフィールを登録して、日々の健康記録を始めましょう。
            </p>
            <button 
              onClick={() => openBirdModal()} 
              className="w-full py-3.5 bg-rose-500 text-white rounded-xl text-sm font-extrabold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>最初の文鳥を登録する</span>
            </button>
          </div>
        </main>
      ) : (
        <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          
          <div className="bg-gradient-to-r from-rose-400 to-rose-300 text-white p-5 rounded-2xl shadow-xl shadow-rose-400/10 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4"><Feather className="w-32 h-32 rotate-45" /></div>
            <BunchoAvatar variety={activeBird?.variety} className="w-16 h-16 border-2 border-white/80 shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold">{activeBird?.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold backdrop-blur">
                  {activeBird?.variety === 'white' ? '白文鳥' : activeBird?.variety === 'sakura' ? '桜文鳥' : activeBird?.variety === 'silver' ? 'シルバー文鳥' : activeBird?.variety === 'cinnamon' ? 'シナモン文鳥' : 'クリーム文鳥'}
                </span>
              </div>
              <div className="text-xs text-white/90 font-medium flex flex-wrap gap-x-4 gap-y-1">
                <span>🎂 {activeBird?.birthday ? `${activeBird.birthday} 生まれ` : '誕生日未設定'}</span>
                <span>⚖️ 目標体重: {activeBird?.targetWeight ? `${activeBird.targetWeight}g` : '未設定'}</span>
              </div>
            </div>
            <button onClick={() => openBirdModal(activeBird)} className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"><Edit3 className="w-4 h-4" /></button>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-white p-1 rounded-xl border border-rose-100 shadow-sm w-full overflow-hidden">
            {[
              { id: 'dashboard', label: 'ダッシュボード', shortLabel: '記録', icon: BarChart2 },
              { id: 'calendar', label: 'カレンダー', shortLabel: 'カレンダー', icon: Calendar },
              { id: 'videos', label: '動画ギャラリー', shortLabel: '動画', icon: Film },
              { id: 'profiles', label: '文鳥たち', shortLabel: 'プロフ', icon: Users },
              { id: 'csv', label: 'データ連携', shortLabel: 'データ', icon: FileSpreadsheet },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  title={tab.label}
                  className={`flex-1 py-2 sm:py-3 px-1 rounded-lg font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${currentTab === tab.id ? 'bg-rose-50 text-rose-500 font-extrabold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline text-xs truncate">{tab.label}</span>
                  <span className="sm:hidden text-[9px] leading-tight text-center truncate w-full">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Dashboard */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400">今日の記録</p>
                    <h4 className="font-bold text-slate-800 text-sm mt-0.5">本日({todayStr})の状態</h4>
                  </div>
                  {todayLog ? (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg"><span>⚖️ 体重:</span><span className="text-rose-500">{todayLog.weight ? `${todayLog.weight}g` : '未記録'}</span></div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg"><span>🥣 ごはん:</span><span className="text-amber-500">{todayLog.food ? `${todayLog.food}g` : '未記録'}</span></div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-xs text-slate-400 mb-3">本日の記録はまだありません。</p>
                      <button onClick={() => openLogModal(todayStr)} className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> 記録する</button>
                    </div>
                  )}
                </div>
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                  <div><p className="text-[10px] font-semibold text-slate-400">最新の体重</p><h4 className="font-bold text-slate-800 text-sm mt-0.5">最後の測定体重</h4></div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-rose-500">{latestWeight ? `${latestWeight}g` : '--'}</span>
                    {activeBird?.targetWeight && latestWeight && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${Math.abs(latestWeight - activeBird.targetWeight) <= 0.5 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        目標との差: {(latestWeight - activeBird.targetWeight).toFixed(1)}g
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                  <div><p className="text-[10px] font-semibold text-slate-400">換羽期のステータス</p><h4 className="font-bold text-slate-800 text-sm mt-0.5">現在の羽状態</h4></div>
                  <div className="mt-4 flex items-center justify-between">
                    {currentlyMolting ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100"><Feather className="w-4 h-4 fill-amber-400 animate-bounce" /><span>現在、換羽期です</span></div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl"><span>通常期（おだやか）</span></div>
                    )}
                  </div>
                </div>
              </div>
              {renderInteractiveCharts()}
              <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-rose-400" />最近の健康メモと動画</h3>
                {activeBirdLogs.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">記録がありません。</p> : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {[...activeBirdLogs].reverse().slice(0, 5).map((log, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-xl flex items-start justify-between gap-3 text-xs border border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-600">{log.date}</span>
                            {log.weight && <span className="bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded font-bold">{log.weight}g</span>}
                            {log.food && <span className="bg-amber-50 text-amber-500 px-1.5 py-0.5 rounded font-bold">🥣 {log.food}g</span>}
                          </div>
                          <p className="text-slate-500 font-medium">{log.memo || 'メモなし'}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {log.videoUrls && log.videoUrls.length > 0 ? (
                            log.videoUrls.map((url, i) => (
                              <button key={i} onClick={() => window.open(url, '_blank')} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center gap-1 font-bold transition-colors text-[10px]">
                                <Play className="w-3 h-3 fill-red-600" /><span>動画 {i + 1}</span>
                              </button>
                            ))
                          ) : log.videoUrl ? (
                            <button onClick={() => window.open(log.videoUrl, '_blank')} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center gap-1 font-bold transition-colors text-[10px]">
                              <Play className="w-3 h-3 fill-red-600" /><span>動画</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'calendar' && (
            <div className="space-y-6">
              {renderCalendar()}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>カレンダーの日付をタップすると、その日の体重、食事量、換羽ステータスなどを追加・更新することができます。</p>
              </div>
            </div>
          )}

          {}
          {currentTab === 'videos' && renderVideoGallery()}

          {currentTab === 'profiles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm">ファミリー一覧</h3>
                <button onClick={() => openBirdModal()} className="px-3 py-1.5 bg-rose-500 text-white rounded-full text-xs font-bold hover:bg-rose-600 transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /><span>新しい文鳥を登録</span></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {birds.map(bird => {
                  const count = logs[bird.id]?.length || 0;
                  return (
                    <div key={bird.id} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                      <div className="flex items-start gap-4">
                        <BunchoAvatar variety={bird.variety} className="w-14 h-14" />
                        <div>
                          <div className="flex items-center gap-2"><h4 className="font-extrabold text-slate-800 text-base">{bird.name}</h4><span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">{bird.gender === 'male' ? '男の子 ♂' : bird.gender === 'female' ? '女の子 ♀' : '不明'}</span></div>
                          <p className="text-xs text-slate-400 mt-1">品種: {bird.variety === 'white' ? '白文鳥' : bird.variety === 'sakura' ? '桜文鳥' : bird.variety === 'silver' ? 'シルバー文鳥' : bird.variety === 'cinnamon' ? 'シナモン文鳥' : 'クリーム文鳥'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">総記録日数: {count} 日分</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button onClick={() => { setActiveBirdId(bird.id); setCurrentTab('dashboard'); }} className="text-xs font-bold text-rose-500 hover:underline">記録を見る &rarr;</button>
                        <div className="flex gap-2">
                          <button onClick={() => openBirdModal(bird)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors" title="編集"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteBirdProfile(bird.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors" title="削除"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: CSV Export */}
          {currentTab === 'csv' && (
            <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-rose-500"><FileSpreadsheet className="w-6 h-6" /><h3 className="font-extrabold text-lg">スプレッドシート連携</h3></div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs text-slate-600 leading-relaxed">
                  <h4 className="font-bold text-slate-800">📋 データ連携手順</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>下の「CSVデータをコピー」または「CSVをダウンロード」で現在のデータを出力できます。</li>
                    <li>エクスポートしたファイルと同じ形式のCSVを用意し、「CSVをインポート」から取り込むことができます。</li>
                    <li>※インポート時、登録されていない名前の文鳥データがある場合は自動で新規プロフィールが作成されます。</li>
                  </ol>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={copyCSVToClipboard} className="px-4 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors flex items-center gap-1.5"><Copy className="w-4 h-4" /><span>CSVデータをコピー</span></button>
                  <button onClick={downloadCSVFile} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-1.5"><Download className="w-4 h-4" /><span>CSVをダウンロード</span></button>
                  <label className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4" /><span>CSVをインポート</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                  </label>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">データプレビュー ({activeBird?.name})</h4>
                  <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-48 whitespace-pre">{exportToCSV()}</div>
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-rose-50 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-rose-500 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-1.5"><Calendar className="w-4 h-4" />健康・活動ログ</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-white hover:text-rose-100 font-bold">✕</button>
            </div>
            <form onSubmit={saveLog} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">記録日</label>
                <input type="date" value={selectedLogDate} onChange={(e) => setSelectedLogDate(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">体重 (g)</label>
                  <input type="number" step="0.1" placeholder="例: 24.5" value={logWeight} onChange={(e) => setLogWeight(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ごはん消費量 (g)</label>
                  <input type="number" step="0.1" placeholder="例: 3.5" value={logFood} onChange={(e) => setLogFood(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">💩 うんちの量</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ value: 'few', label: '少ない' }, { value: 'normal', label: '普通' }, { value: 'many', label: '多い' }].map(p => (
                    <button key={p.value} type="button" onClick={() => setLogPoop(p.value)} className={`py-2 rounded-xl text-xs font-bold transition-all border ${logPoop === p.value ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">🪶 換羽期のステータス変更</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setLogMoltEvent('')} className={`py-2 rounded-xl text-xs font-bold transition-all border ${logMoltEvent === '' ? 'bg-rose-50 text-rose-600 border-rose-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>変更なし</button>
                  <button type="button" onClick={() => {
                      if (getMoltingStatusOnDate(selectedLogDate) && activeBirdLogs.find(l => l.date === selectedLogDate)?.moltEvent !== 'start') {
                        setAlertMessage("すでに換羽が開始されています。");
                      } else setLogMoltEvent('start');
                    }} 
                    disabled={getMoltingStatusOnDate(selectedLogDate) && activeBirdLogs.find(l => l.date === selectedLogDate)?.moltEvent !== 'start'} 
                    className={`py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-40 ${logMoltEvent === 'start' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>換羽開始</button>
                  <button type="button" onClick={() => {
                      if (!getMoltingStatusOnDate(selectedLogDate) && activeBirdLogs.find(l => l.date === selectedLogDate)?.moltEvent !== 'end') {
                        setAlertMessage("現在、換羽期に入っていません。");
                      } else setLogMoltEvent('end');
                    }} 
                    disabled={!getMoltingStatusOnDate(selectedLogDate) && activeBirdLogs.find(l => l.date === selectedLogDate)?.moltEvent !== 'end'} 
                    className={`py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-40 ${logMoltEvent === 'end' ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>換羽終了</button>
                </div>
              </div>

              {}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-700">🎥 記録動画（YouTube連携）</label>
                  {!youtubeConfig.clientId && (
                    <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-bold">要API設定</span>
                  )}
                </div>
                
                {logVideoUrls.length > 0 && (
                  <div className="space-y-2 mb-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500">登録済み動画 ({logVideoUrls.length}件)</p>
                    {logVideoUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-[10px] text-blue-500 truncate hover:underline">{url}</a>
                        <button type="button" onClick={() => setLogVideoUrls(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="削除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {!isUploadingMock && !selectedFileForUpload ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                        <Camera className="w-4 h-4" /><span>カメラで撮影</span>
                        <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedFileForUpload(e.target.files[0]);
                          e.target.value = '';
                        }} />
                      </label>
                      
                      <label className="flex-1 py-2 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 shadow-sm">
                        <FileVideo className="w-4 h-4" /><span>動画ファイルを選択</span>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedFileForUpload(e.target.files[0]);
                          e.target.value = ''; // Reset input
                        }} />
                      </label>
                    </div>
                  ) : selectedFileForUpload && !isUploadingMock ? (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center space-y-3">
                      <p className="text-[10px] font-bold text-blue-800 truncate px-2">📎 {selectedFileForUpload.name}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleYoutubeUpload(selectedFileForUpload)} className="flex-1 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg text-xs font-bold transition-colors shadow-sm">アップロード開始</button>
                        <button type="button" onClick={() => setSelectedFileForUpload(null)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors">取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-4 rounded-xl text-center space-y-2 border border-slate-200">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></span><p className="text-xs font-bold text-slate-700">YouTubeへアップロード中... ({uploadProgress}%)</p>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-1.5">既存のYouTubeリンクを追加：</p>
                  <div className="flex gap-2">
                    <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={newVideoUrlInput} onChange={(e) => setNewVideoUrlInput(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                    <button type="button" onClick={() => {
                      if (newVideoUrlInput.trim()) {
                        setLogVideoUrls(prev => [...prev, newVideoUrlInput.trim()]);
                        setNewVideoUrlInput('');
                      }
                    }} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors whitespace-nowrap">追加</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">📝 健康メモ</label>
                <textarea placeholder="文鳥の様子、遊んだ時間、気になったことなど..." value={logMemo} onChange={(e) => setLogMemo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 h-20 resize-none" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-extrabold hover:bg-rose-600 transition-all flex items-center justify-center gap-1 shadow-lg shadow-rose-200"><Check className="w-4 h-4" /><span>記録を保存</span></button>
                {activeBirdLogs.some(l => l.date === selectedLogDate) && (
                  <button type="button" onClick={() => deleteLog(selectedLogDate)} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs transition-colors" title="この日の記録を削除"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {isBirdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-rose-50">
            <div className="p-4 bg-rose-500 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-1.5"><Users className="w-4 h-4" />{editingBird ? '文鳥プロフィールの編集' : '新しい文鳥の登録'}</h3>
              <button onClick={() => setIsBirdModalOpen(false)} className="text-white hover:text-rose-100 font-bold">✕</button>
            </div>
            <form onSubmit={saveBirdProfile} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">品種タイプ (イラスト色切り替え)</label>
                <div className="grid grid-cols-5 gap-2">
                  {[{ id: 'white', label: '白' }, { id: 'sakura', label: '桜' }, { id: 'silver', label: '銀' }, { id: 'cinnamon', label: 'シナモン' }, { id: 'cream', label: 'クリーム' }].map(v => (
                    <button key={v.id} type="button" onClick={() => setBirdVariety(v.id)} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${birdVariety === v.id ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                      <BunchoAvatar variety={v.id} className="w-8 h-8 border-none" /><span className="text-[9px] font-extrabold text-slate-600">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">お名前</label>
                <input type="text" placeholder="例: ぶんちゃん" value={birdName} onChange={(e) => setBirdName(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">性別</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: 'male', label: '男の子 ♂' }, { id: 'female', label: '女の子 ♀' }, { id: 'unknown', label: '不明' }].map(g => (
                    <button key={g.id} type="button" onClick={() => setBirdGender(g.id)} className={`py-2 rounded-xl text-xs font-bold transition-all border ${birdGender === g.id ? 'bg-rose-50 text-rose-600 border-rose-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{g.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">お誕生日</label>
                  <input type="date" value={birdBirthday} onChange={(e) => setBirdBirthday(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">目標体重 (g)</label>
                  <input type="number" step="0.1" placeholder="例: 25.0" value={birdTargetWeight} onChange={(e) => setBirdTargetWeight(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">紹介メモ</label>
                <textarea placeholder="お気に入りのご飯、好きな遊び、性格など..." value={birdMemo} onChange={(e) => setBirdMemo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 h-16 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-rose-500 text-white rounded-xl text-xs font-extrabold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200">保存する</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}