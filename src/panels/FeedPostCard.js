import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Div, RichCell, SimpleCell } from '@vkontakte/vkui';
import { Icon16CommentOutline, Icon16View } from '@vkontakte/icons';
import PropTypes from 'prop-types';

import { fetchComments } from '../utils';
import {
  formatPostDate,
  getPostAvatarUrl,
  getPostForwardInfo,
  getPostMedia,
  getPostSenderLabel,
  getPostText,
} from '../utils/channel';
import { usePostViewTracker } from '../hooks/usePostViewTracker';

function renderFeedMedia(mediaItem, registerVideo, mediaId) {
  if (mediaItem.kind === 'image') {
    return <img key={mediaItem.url} className="feed-card__media feed-card__media--image" src={mediaItem.url} alt={mediaItem.name} loading="lazy" />;
  }

  if (mediaItem.kind === 'video') {
    return (
      <div key={mediaItem.url} className="feed-card__media-shell">
        <video
          ref={registerVideo ? registerVideo(mediaId) : undefined}
          className="feed-card__media feed-card__media--video"
          src={mediaItem.url}
          controls
          preload="metadata"
          playsInline
        />
      </div>
    );
  }

  if (mediaItem.kind === 'audio') {
    return (
      <div key={mediaItem.url} className="feed-card__file">
        <div className="feed-card__file-label">{mediaItem.label}</div>
        <audio src={mediaItem.url} controls preload="metadata" />
      </div>
    );
  }

  return (
    <a key={mediaItem.url} className="feed-card__file feed-card__file--link" href={mediaItem.url} target="_blank" rel="noreferrer">
      {mediaItem.label}: {mediaItem.name}
    </a>
  );
}

export const FeedPostCard = ({ post, commentsAuth, onOpenPost, registerVideo }) => {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const viewStats = usePostViewTracker(cardRef, post.id, commentsAuth.token);
  const [commentsState, setCommentsState] = useState({
    total: 0,
    isLoading: false,
    error: '',
  });

  const senderLabel = getPostSenderLabel(post);
  const text = getPostText(post);
  const media = getPostMedia(post);
  const forwardInfo = getPostForwardInfo(post);
  const avatarUrl = getPostAvatarUrl(post);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      setIsVisible(true);
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '300px 0px',
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCommentsPreview() {
      if (!isVisible) {
        return;
      }

      setCommentsState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
      }));

      try {
        // We only need total comments in the feed. Full list opens in a bottom sheet.
        const payload = await fetchComments(post.id, commentsAuth.token, { limit: 1 });
        if (!isMounted) {
          return;
        }

        setCommentsState({
          total: payload.total || 0,
          isLoading: false,
          error: '',
        });
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setCommentsState({
          total: 0,
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : 'Не удалось загрузить комментарии',
        });
      }
    }

    loadCommentsPreview();

    return () => {
      isMounted = false;
    };
  }, [commentsAuth.token, isVisible, post.id]);

  return (
    <div ref={cardRef}>
      <Card mode="shadow" className="feed-card">
        <Div>
        {media.length ? (
          <div className="feed-card__media-list">
            {media.map((mediaItem, index) => renderFeedMedia(mediaItem, registerVideo, `${post.id}:${index}`))}
          </div>
        ) : null}

        <button type="button" className="feed-card__content-button" onClick={() => onOpenPost(post.id)}>
          <RichCell
            disabled
            before={
              avatarUrl ? (
                <Avatar size={40} src={avatarUrl} />
              ) : (
                <Avatar size={40}>{senderLabel[0]}</Avatar>
              )
            }
            caption={`ID ${post.id}`}
            subhead={formatPostDate(post.date)}
          >
            {senderLabel}
          </RichCell>

          {forwardInfo ? (
            <SimpleCell disabled subtitle={forwardInfo.dateLabel || 'Пересланное сообщение'}>
              Переслано от {forwardInfo.name}
            </SimpleCell>
          ) : null}

          {viewStats !== null ? (
            <div className="feed-card__views">
              <Icon16View />
              <span>{viewStats.views_total.toLocaleString('ru-RU')}</span>
            </div>
          ) : null}

          <div className="feed-card__text">{text || 'Без текста'}</div>
        </button>

        <div className="feed-card__comments">
          <div className="feed-card__comments-title">Комментарии</div>
          <Div className="feed-card__actions">
            <Button size="m" mode="secondary" stretched onClick={() => onOpenPost(post.id, 'comments')}>
              <span className="feed-card__comments-button-content">
                <Icon16CommentOutline />
                <span>Комментарии</span>
                {!commentsState.isLoading && commentsState.total > 0 ? (
                  <span className="feed-card__comments-count">{commentsState.total}</span>
                ) : null}
              </span>
            </Button>
          </Div>
          {!commentsState.isLoading && commentsState.error ? <div className="feed-card__comments-state">{commentsState.error}</div> : null}
        </div>
        </Div>
      </Card>
    </div>
  );
};

FeedPostCard.propTypes = {
  commentsAuth: PropTypes.shape({
    token: PropTypes.string.isRequired,
  }).isRequired,
  onOpenPost: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
  registerVideo: PropTypes.func.isRequired,
};