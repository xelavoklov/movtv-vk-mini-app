import { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Div,
  FormItem,
  IconButton,
  Textarea,
} from '@vkontakte/vkui';
import { Icon16Cancel, Icon16LikeOutline, Icon20LikeCircleFillRed } from '@vkontakte/icons';
import PropTypes from 'prop-types';

import { createComment, fetchComments, likeComment, unlikeComment } from '../utils';
import { formatPostDate } from '../utils/channel';

export const CommentsSheet = ({ postId, commentsAuth, onClose }) => {
  const [commentsState, setCommentsState] = useState({
    items: [],
    total: 0,
    isLoading: true,
    error: '',
  });
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentActionId, setCommentActionId] = useState('');

  const refreshComments = async () => {
    const payload = await fetchComments(postId, commentsAuth.token);
    setCommentsState({
      items: payload.items || [],
      total: payload.total || 0,
      isLoading: false,
      error: '',
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      if (!postId) {
        setCommentsState({ items: [], total: 0, isLoading: false, error: '' });
        return;
      }

      setCommentsState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: '',
      }));

      try {
        const payload = await fetchComments(postId, commentsAuth.token);
        if (!isMounted) {
          return;
        }

        setCommentsState({
          items: payload.items || [],
          total: payload.total || 0,
          isLoading: false,
          error: '',
        });
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setCommentsState({
          items: [],
          total: 0,
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : 'Не удалось загрузить комментарии',
        });
      }
    }

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [commentsAuth.token, postId]);

  const handleSubmitComment = async () => {
    const body = newComment.trim();

    if (!body || !commentsAuth.token) {
      return;
    }

    try {
      setIsSubmittingComment(true);
      await createComment(postId, body, commentsAuth.token);
      setNewComment('');
      await refreshComments();
    } catch (submitError) {
      setCommentsState((currentState) => ({
        ...currentState,
        error: submitError instanceof Error ? submitError.message : 'Не удалось отправить комментарий',
      }));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleLike = async (comment) => {
    if (!commentsAuth.token) {
      return;
    }

    try {
      setCommentActionId(String(comment.id));

      if (comment.is_liked_by_me) {
        await unlikeComment(comment.id, commentsAuth.token);
      } else {
        await likeComment(comment.id, commentsAuth.token);
      }

      await refreshComments();
    } catch (commentError) {
      setCommentsState((currentState) => ({
        ...currentState,
        error: commentError instanceof Error ? commentError.message : 'Не удалось обновить лайк',
      }));
    } finally {
      setCommentActionId('');
    }
  };

  return (
    <div className="comments-sheet comments-sheet--open" role="dialog" aria-modal="true" aria-label="Комментарии">
      <button type="button" className="comments-sheet__backdrop" aria-label="Закрыть комментарии" onClick={onClose} />
      <div className="comments-sheet__panel">
        <div className="comments-sheet__header">
          <div className="comments-sheet__title">Комментарии</div>
          <IconButton aria-label="Закрыть" onClick={onClose}>
            <Icon16Cancel />
          </IconButton>
        </div>

        <div className="comments-sheet__content">
          {commentsAuth.token ? (
            <FormItem top="Новый комментарий">
              <Textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Напишите комментарий к этому посту"
                maxLength={4000}
              />
              <Div className="comments-compose__actions">
                <Button size="m" onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmittingComment}>
                  {isSubmittingComment ? 'Отправляю…' : 'Отправить'}
                </Button>
              </Div>
            </FormItem>
          ) : (
            <>
              <FormItem top="Новый комментарий">
                <Textarea value="" placeholder="Чтобы писать комментарии, открой мини-приложение внутри VK" disabled />
                <Div className="comments-compose__actions">
                  <Button size="m" disabled>
                    Отправить
                  </Button>
                </Div>
              </FormItem>
              <Div className="comments-state">В браузере доступно только чтение. Для отправки открой приложение внутри VK.</Div>
            </>
          )}

          {commentsState.isLoading ? <Div className="comments-state">Загружаю комментарии…</Div> : null}
          {!commentsState.isLoading && commentsState.error ? <Div className="comments-state">{commentsState.error}</Div> : null}
          {!commentsState.isLoading && !commentsState.error && commentsState.items.length === 0 ? (
            <Div className="comments-state">Пока комментариев нет.</Div>
          ) : null}

          {!commentsState.isLoading && !commentsState.error && commentsState.items.length > 0 ? (
            <Div className="comments-list">
              {commentsState.items.map((comment) => {
                const commentAuthor = [comment.user.first_name, comment.user.last_name].filter(Boolean).join(' ');
                const isLikeActionPending = commentActionId === String(comment.id);

                return (
                  <div key={comment.id} className="comment-card">
                    <div className="comment-card__header">
                      <div className="comment-card__author">
                        <Avatar size={32} src={comment.user.photo_100}>{comment.user.first_name?.[0]}</Avatar>
                        <div>
                          <div className="comment-card__name">{commentAuthor || `VK ${comment.user.vk_user_id}`}</div>
                          <div className="comment-card__meta">{formatPostDate(comment.created_at)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="comment-card__body">{comment.body}</div>

                    <div className="comment-card__actions">
                      <IconButton
                        aria-label="Лайк"
                        disabled={!commentsAuth.token || isLikeActionPending}
                        onClick={() => handleToggleLike(comment)}
                      >
                        {comment.is_liked_by_me ? <Icon20LikeCircleFillRed /> : <Icon16LikeOutline />}
                      </IconButton>
                      <span className="comment-card__likes">{comment.likes_count}</span>
                    </div>
                  </div>
                );
              })}
            </Div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

CommentsSheet.propTypes = {
  commentsAuth: PropTypes.shape({
    token: PropTypes.string.isRequired,
  }).isRequired,
  postId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
};
