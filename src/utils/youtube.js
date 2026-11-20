/**
 * TubeCalm YouTube URL & ID Parser
 * Supports all standard, short, shorts, embed, live, music, and playlist links.
 */

export function parseYouTubeUrl(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { isValid: false, error: 'Please enter a valid YouTube video or playlist link.' };
  }

  const input = rawInput.trim();

  // 1. Direct raw 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return {
      isValid: true,
      type: 'video',
      videoId: input,
      playlistId: null,
      startTime: 0,
      cleanUrl: `https://www.youtube.com/watch?v=${input}`
    };
  }

  // 2. Direct raw playlist ID (typically starts with PL, UU, RD, FL, OL, etc.)
  if (/^(PL|UU|RD|FL|OL)[a-zA-Z0-9_-]{10,}$/.test(input)) {
    return {
      isValid: true,
      type: 'playlist',
      videoId: null,
      playlistId: input,
      startTime: 0,
      cleanUrl: `https://www.youtube.com/playlist?list=${input}`
    };
  }

  try {
    // If user entered without protocol (e.g. "youtube.com/watch?v=..."), prepend https://
    let urlStr = input;
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }

    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

    const validHosts = [
      'youtube.com',
      'youtu.be',
      'music.youtube.com',
      'youtube-nocookie.com',
      'tubecalm.com'
    ];

    if (!validHosts.some(h => host === h || host.endsWith('.' + h))) {
      return { isValid: false, error: 'That does not look like a YouTube URL. Please check and try again.' };
    }

    let videoId = null;
    let playlistId = null;
    let startTime = 0;

    // Parse Start Time parameter (t= or start=)
    const tParam = url.searchParams.get('t') || url.searchParams.get('start') || '';
    if (tParam) {
      startTime = parseTimestamp(tParam);
    } else if (url.hash && url.hash.includes('t=')) {
      const match = url.hash.match(/t=([0-9hms]+)/);
      if (match) startTime = parseTimestamp(match[1]);
    }

    // Parse Playlist parameter (list=)
    const listParam = url.searchParams.get('list');
    if (listParam && /^[a-zA-Z0-9_-]+$/.test(listParam)) {
      playlistId = listParam;
    }

    // Handle youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) {
        videoId = pathParts[0];
      }
    }
    // Handle youtube.com/shorts/VIDEO_ID
    else if (url.pathname.startsWith('/shorts/')) {
      const pathParts = url.pathname.replace('/shorts/', '').split('/').filter(Boolean);
      if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) {
        videoId = pathParts[0];
      }
    }
    // Handle youtube.com/live/VIDEO_ID
    else if (url.pathname.startsWith('/live/')) {
      const pathParts = url.pathname.replace('/live/', '').split('/').filter(Boolean);
      if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) {
        videoId = pathParts[0];
      }
    }
    // Handle youtube.com/embed/VIDEO_ID
    else if (url.pathname.startsWith('/embed/')) {
      const pathParts = url.pathname.replace('/embed/', '').split('/').filter(Boolean);
      if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) {
        videoId = pathParts[0];
      }
    }
    // Handle youtube.com/watch?v=VIDEO_ID or tubecalm.com/?v=VIDEO_ID
    else {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        videoId = vParam;
      }
    }

    // Determine Result Type
    if (videoId && playlistId) {
      return {
        isValid: true,
        type: 'video-in-playlist',
        videoId,
        playlistId,
        startTime,
        cleanUrl: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
      };
    }

    if (videoId) {
      return {
        isValid: true,
        type: 'video',
        videoId,
        playlistId: null,
        startTime,
        cleanUrl: `https://www.youtube.com/watch?v=${videoId}${startTime > 0 ? `&t=${startTime}s` : ''}`
      };
    }

    if (playlistId) {
      return {
        isValid: true,
        type: 'playlist',
        videoId: null,
        playlistId,
        startTime: 0,
        cleanUrl: `https://www.youtube.com/playlist?list=${playlistId}`
      };
    }

    return {
      isValid: false,
      error: 'Could not extract a YouTube video or playlist ID from that link.'
    };
  } catch (err) {
    return {
      isValid: false,
      error: 'Invalid URL format. Please paste a full YouTube video or playlist URL.'
    };
  }
}

/**
 * Parses timestamp string into total seconds.
 * Handles: "1h30m15s", "90s", "120", "1m30s", "45m", "2h"
 */
export function parseTimestamp(str) {
  if (!str) return 0;
  const s = String(str).toLowerCase().trim();

  // If pure integer/number
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10);
  }

  let totalSeconds = 0;
  const hoursMatch = s.match(/(\d+)h/);
  const minutesMatch = s.match(/(\d+)m/);
  const secondsMatch = s.match(/(\d+)s/);

  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1], 10);

  return totalSeconds;
}

/**
 * Formats seconds into human-readable MM:SS or HH:MM:SS
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const paddedS = s < 10 ? '0' + s : s;
  if (h > 0) {
    const paddedM = m < 10 ? '0' + m : m;
    return `${h}:${paddedM}:${paddedS}`;
  }
  return `${m}:${paddedS}`;
}

