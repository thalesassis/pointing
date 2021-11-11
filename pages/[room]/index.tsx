import React, { Component, useEffect, useState, useContext, useRef } from "react";
import { withRouter } from 'next/router';
import _ from 'lodash';
import socketContext from '../../context/socketContext';
import { FaEdit, FaUser, FaLongArrowAltRight } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineLink, AiOutlineCloseCircle } from 'react-icons/ai';
import { VscDebugRestart } from 'react-icons/vsc';
import { BiDoorOpen, BiSad, BiSearchAlt } from 'react-icons/bi';
import { usePageVisibility } from 'react-page-visibility';
import ReactMarkdown from 'react-markdown';

const Room = (props) => {
  const socket = useContext(socketContext);
  const [userNameInput, setUserNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [userList, setUserList] = useState({});
  const [newUserList, setNewUserList] = useState({});
  const [pointList, setPointList] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [revealVotes, setRevealVotes] = useState(false);
  const [whoVoted, setWhoVoted] = useState(null)
  const [whoVoting, setWhoVoting] = useState(null)
  const [storyId, setStoryId] = useState('');
  const [story, setStory] = useState({ id: '', url: '', name: '', description: '' });
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyNotFound, setStoryNotFound] = useState(false);
  const [findStoryLabel, setFindStoryLabel] = useState('Load Story');
  const [findStoryDisabled, setFindStoryDisabled] = useState(false);
  const [storyCooldown, setStoryCooldown] = useState(false);
  let isRendered = false;

  const isVisible = usePageVisibility();

  useEffect(() => {    
    isRendered = true;

    const listen = (message, func) => {
      socket.on(message, (ret) => {
        if (isRendered) { func(ret); }
      })
    }

    listen("room-users", (data) => {
      data = JSON.parse(data);
      setUserList(data);
      let user = _.find(data, x => x.id === socket.id);
      if (user !== undefined && user.name) {
        setUserName(user.name);
      }
    })

    listen("reset-votes", (data) => {
      setMyVote(null);
      let resetedUserList = JSON.parse(data);
      setNewUserList(resetedUserList);
    })

    listen("room-points", (data) => {
      setPointList(JSON.parse(data));
    })

    listen("someone-voted", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoted(vote);
    })

    listen("someone-voting", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoting(vote);
    })

    listen("update-is-voting", (data) => {  
      socket.emit('is-voting', isVisible);
    })

    listen("reveal-votes", (data) => {      
      setRevealVotes(true);
    })

    listen("update-votes", (data) => {      
      setRevealVotes(true);
    })

    listen("recover-vote", (data) => {
      setMyVote(data);
    })

    listen("rejoin", (data) => {
      socket.emit("joined-room");
    })

    listen("goto-room", (roomName) => {
      props.router.push('/' + roomName);
    })

    listen("goto-index", (data) => {      
      props.router.push('/');
    })

    listen("story-loading", (data) => { 
      setStoryLoading(data);     
    })

    listen("story-loaded", (story) => {      
      if (!_.isEmpty(story)) {
        setStoryNotFound(false);
        setStory(story);
        setStoryLoading(false);
        if (!story.no_cooldown) {
          setStoryCooldown(true);
        }
      }
    })

    listen("story-404", () => {
      setStoryNotFound(true);
      setStoryLoading(false);
      setStoryCooldown(true);
    })

    listen("close-story", () => {
      setStory({ id: '', url: '', name: '', description: '' });
    })

    return () => {
      isRendered = false;
    };
  }, [])


  useEffect(() => {
    const room = props.router.query.room;
    if (room) {
      socket.emit('check-room-exists', room);
    }
  }, [props.router.query])

  useEffect(() => {
    /*
    _.each(newUserList, (ul) => {
      let usr = _.find(userList, x => x.id === ul.id);
      ul.data.voting = usr.data.voting;
    })
    */

    setUserList(newUserList);
  }, [newUserList])  

  useEffect(() => {
    if (whoVoted) {
      let userListPointed = _.cloneDeep(userList);
      let u = _.find(userListPointed, x => x.id === whoVoted.id);
      if (u) {
        u.data.point = whoVoted.vote;
        u.data.flipEffect = true;
      }

      setUserList(userListPointed);
    }
  }, [whoVoted])

  useEffect(() => {
    if (whoVoting) {
      let userListPointed = _.cloneDeep(userList);
      let u = _.find(userListPointed, x => x.id === whoVoting.id);
      if (u) {
        u.data.voting = whoVoting.status;
      }
      setUserList(userListPointed);
    }
  }, [whoVoting])

  useEffect(() => {
    if (Object.keys(userList).length > 0 && myVote === null) {
      vote('Not voted');
    }
  }, [userList])

  useEffect(() => {
    if (revealVotes) {
      vote(myVote);
      setRevealVotes(false);
    }
  }, [revealVotes])

  useEffect(() => {
    socket.emit('is-voting', isVisible);
  }, [isVisible])

  useEffect(() => {
    if (story.description) {
      let s = linkify(story.description);
      s = s.replace(/\n/g, '  \n');
      s = s.replace(/    -/g, '        -');
      s = s.replace(/  -/g, '    -');
      story.description = s;
    }
  }, [story])


  useEffect(() => {
    if (storyCooldown) {
      setStoryCooldown(false);
      setFindStoryDisabled(true);
      let timeout = 6;
      let timer = setInterval(() => {
        timeout -= 1;
        setFindStoryLabel('Load Story' + ' (' + timeout + ')')
        if (timeout == 0) {
          clearInterval(timer);
          setFindStoryDisabled(false);
          setFindStoryLabel('Load Story')
        }
      }, 1000)
    }
  }, [storyCooldown])


  const linkify = (inputText) => {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '[$1]($1)');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '[$1]($2)');

    return replacedText;
  }

  const vote = (val) => {
    if (val !== null) {
      let userListPointed = _.cloneDeep(userList);
      let userListP = _.find(userListPointed, x => x.id === socket.id);
      if (userListP && userListP.data !== undefined) {
        userListP.data.point = val;        
      }
      setMyVote(val);
      setUserList(userListPointed);

    }
    socket.emit("voted", val);
  }

  const revealVotesAction = () => {
    socket.emit("reveal-votes");
  }
  const resetVotesAction = () => {
    socket.emit("reset-votes");
  }
  const leaveRoomAction = () => {
    socket.emit("leave-room");
  }
  const getStory = (e) => {
    e.preventDefault();
    setStoryLoading(true);
    setStoryNotFound(false);
    socket.emit("get-story", storyId);
  }
  const start = (e) => {
    e.preventDefault();
    setEditingName(false);
    socket.emit("user-name", userNameInput);
    socket.emit("is-voting", true);
  }
  const closeStory = (e) => {
    e.preventDefault();
    socket.emit("close-story");
  }


  return (
    <main>
      <div className="card-logo enlarge">
        <span><i>D</i></span>
        <span>u</span>
        <span>n</span>
        <span>d</span>
        <span>i</span>
        <span>e</span>
        <span>s</span>
        <div className="symple">symple points</div>
      </div>
      <div className="top">
        <div className="top-left">

          {(userName === '' || editingName) && (
          <div className="joined-as">
            <>
              { !editingName &&
              <div className="blurb">To join this pointing session, please enter your name:</div>}
              { editingName &&
              <div className="blurb">What's your new name?</div>}
              <div className="field">
                <form className="flex" onSubmit={(e) => start(e)}>
                  <input type="text" className="regular-input mr-10" placeholder="Name" required onChange={(e) => setUserNameInput(e.target.value)} value={userNameInput} /> 
                  <button disabled={userNameInput.length < 1} className="action">Start</button>
                </form> 
              </div> 
            </>
          </div>
          )}

          {userName !== '' && !editingName && (
            <>
                <h2 className="username"><a className="icon" onClick={() => { setEditingName(true); }}><FaEdit /></a>
                {userName}</h2>
            </>
          )}

        </div>

        <div className="top-right">
          <div className="top-action">
            <button title="Leave room" onClick={() => { leaveRoomAction() }} className="action icon-button"><BiDoorOpen /></button> 
          </div>
          <div className="top-info">
            {Object.values(userList).filter((x: any) => x.name == undefined).length >= 0 &&
            <div className="observers">
              <div className="info"><span>{Object.values(userList).filter((x: any) => x.name == undefined).length}</span> Observing</div>
              <div className="info"><span>{Object.values(userList).filter((x: any) => x.name != undefined).length}</span> Participating</div>
            </div>}
          </div>
        </div>
      </div>


      <div className="booklet">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">

        <div className="flex">


          <div className="point">
            <ul className="point-options">
            {Object.values(pointList).map((val: any) => {
              return <li key={val}><button className="shadow" onClick={() => { vote(val) }}>{val}</button></li>
            })}
            </ul>

            <ul className="name-list">
            {Object.values(userList).map((val: any) => {
              return val.name && (<li key={val.id}>
                <div className="name">{val.name}</div>


                <div className="card-placeholder">

                  {(socket.id == val.id) && val.data.point != 'Not voted' && val.data.point != 'Voted' &&
                    <div className={`vote-card flipped`} >
                    <div className="inner">
                        <div className="front shadow">{val.data.point}</div>
                        <div className="back card-logo"><span><i>D</i></span></div>
                      </div>
                    </div>
                  }

                  {(socket.id != val.id) && val.data.point != 'Not voted' && val.data.point != 'Voted' &&
                  <div className={`vote-card unflip`} >
                    <div className="inner">
                      <div className="front shadow">{val.data.point}</div>
                      <div className="back card-logo"><span><i>D</i></span></div>
                    </div>
                  </div>
                  }

                  {val.data.point == 'Voted' &&
                  <div className="vote-card fadeIn">
                    <div className="inner">
                      <div className="front shadow">{val.data.point}</div>
                      <div className="back card-logo"><span><i>D</i></span></div>
                    </div>
                  </div>
                  }

                  {val.data.point == 'Not voted' &&
                  <div className="vote-card">
                    <div className="inner bg-white">
                      <div className="back shadow">
                      {val.data.voting &&
                        <div className="wave">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </div>
                      }

                      {!val.data.voting &&
                      <div className="wave stopped">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </div>
                      }
                      </div>
                    </div>
                  </div>
                  }

                </div>
              </li>)
            })}

            {Object.values(userList).find((x: any) => x.name != undefined) == undefined &&
              <li>No one joined the pointing yet.</li>}
            </ul>

            {!(Object.values(userList).find((x: any) => x.name != undefined) == undefined) &&
              <div className="pointing-actions">
                <button className="action danger fleft" onClick={() => { resetVotesAction() }}><VscDebugRestart />Reset</button> 
                <button className="action secondary fright" onClick={() => { revealVotesAction() }}><AiOutlineEye />Reveal votes</button> 
              </div>
            }
          </div>

          <div className="story">
            <form className="flex" onSubmit={(e) => getStory(e)}>
              <input className="regular-input mr-10" type="text" placeholder="Story ID" required onChange={(e) => setStoryId(e.target.value)} value={storyId} /> 
              <button className="action nowrap load-story" disabled={findStoryDisabled || storyLoading}>{ findStoryLabel }</button>
            </form> 
            {storyNotFound && <div className="story-status"><BiSad /> The story was not found.</div>}
            {storyLoading && <div className="story-status"><BiSearchAlt /> Loading a story, please wait...</div>}

            {story.id && 
            <div>
              <a className="title" href={story.url} target="_blank"><AiOutlineLink /> {story.name}</a>
              <div className="description tracker-markup">
                <ReactMarkdown
                children={ story.description }
                linkTarget='_blank'
                ></ReactMarkdown>
              </div>
              <button className="action mt-10 danger fright" onClick={(e) => { closeStory(e) }}><AiOutlineCloseCircle />Close Story</button> 
            </div>
            }
          </div>

        </div>


      </div>
      </div>
      </div>
      </div>
      </div>
    </main>
  );
}

export default withRouter(Room);