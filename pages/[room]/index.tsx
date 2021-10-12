import React, { Component, useEffect, useState, useContext, useRef } from "react";
import { withRouter } from 'next/router';
import _ from 'lodash';
import socketContext from '../../context/socketContext';
import nl2br from 'react-nl2br';
import { FaEdit, FaUser, FaLongArrowAltRight } from 'react-icons/fa';
import { AiOutlineEye  } from 'react-icons/ai';
import { VscDebugRestart } from 'react-icons/vsc';
import { BiDoorOpen } from 'react-icons/bi';


const Room = (props) => {
  const socket = useContext(socketContext);
  const [userNameInput, setUserNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [userList, setUserList] = useState({});
  const [pointList, setPointList] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [revealVotes, setRevealVotes] = useState(false);
  const [whoVoted, setWhoVoted] = useState(null)
  const [storyId, setStoryId] = useState('');
  const [story, setStory] = useState({ id: '', url: '', name: '', description: '' });
  const [storyLoading, setStoryLoading] = useState(false);
  const [findStoryLabel, setFindStoryLabel] = useState('Find Story');
  const [findStoryDisabled, setFindStoryDisabled] = useState(false);
  let isRendered = false;

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
      console.log(data);
      let user = _.find(data, x => x.id === socket.id);
      if (user !== undefined && user.name) {
        setUserName(user.name);
      }

      console.log(userList);
    })

    listen("reset-votes", (data) => {
      setMyVote(null);
      setUserList(JSON.parse(data));
    })

    listen("room-points", (data) => {
      setPointList(JSON.parse(data));
    })

    listen("someone-voted", (data) => {      
      let vote = JSON.parse(data);
      setWhoVoted(vote);
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
      console.log(story);
      setStory(story);
      setStoryLoading(false);
    })

    return () => {
      isRendered = false;
    };
  }, [])

  useEffect(() => {
    if (storyLoading) {
      setFindStoryDisabled(true);
      let timeout = 6;
      let timer = setInterval(() => {
        timeout -= 1;
        setFindStoryLabel('Find Story' + ' (' + timeout + ')')
        if (timeout == 0) {
          clearInterval(timer);
          setFindStoryDisabled(false);
          setFindStoryLabel('Find Story')
        }
      }, 1000)
    }
  }, [storyLoading])

  useEffect(() => {
    const room = props.router.query.room;
    if (room) {
      socket.emit('check-room-exists', room);
    }
  }, [props.router.query])

  useEffect(() => {
    if (whoVoted) {
      let userListPointed = _.cloneDeep(userList);
      _.find(userListPointed, x => x.id === whoVoted.id).data.point = whoVoted.vote;
      setUserList(userListPointed);
    }
  }, [whoVoted])

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
    socket.emit("get-story", storyId);
  }
  const start = (e) => {
    e.preventDefault();
    setEditingName(false);
    socket.emit("user-name", userNameInput);
  }

  return (
    <main>

      <div className="point">

        <div className="name-box">
        {(userName === '' || editingName) && (
          <>
            <div className="blurb">Please enter your name:</div>
            <div className="field">
              <input type="text" placeholder="Name" required onChange={(e) => setUserNameInput(e.target.value)} value={userNameInput} /> 
              <button onClick={start}>Start</button> 
            </div> 
          </>
        )}

        {userName !== '' && !editingName && (
          <>
            <div className="blurb">JOINED AS</div>
            <div className="field">
              <a className="icon" onClick={() => { setEditingName(true); }}><FaEdit /></a>
              {userName}
            </div> 
          </>
        )}
        </div>

        <ul className="point-options">
        {Object.values(pointList).map((val: any) => {
          return <li key={val}><button onClick={() => { vote(val) }}>{val}</button></li>
        })}
        </ul>

        <ul className="name-list">
        {Object.values(userList).map((val: any) => {
          return val.name && (<li key={val.id}>
            <span><FaUser /></span>
            <div className="name">{val.name} <FaLongArrowAltRight /></div>
            <div className="vote">{val.data.point}</div>
          </li>)
        })}
        </ul>

        {Object.values(userList).find((x: any) => x.name != undefined) == undefined &&
        <div>No one joined the pointing</div>}

        {Object.values(userList).filter((x: any) => x.name == undefined).length &&
        <div> {Object.values(userList).filter((x: any) => x.name == undefined).length} Observer{ Object.values(userList).filter((x: any) => x.name == undefined).length != 1 ? 's' : '' }</div>}

        <button onClick={() => { revealVotesAction() }}><AiOutlineEye />Reveal votes</button> 
        <button onClick={() => { resetVotesAction() }}><VscDebugRestart />Reset</button> 
        <button onClick={() => { leaveRoomAction() }}><BiDoorOpen />Leave Room</button> 

      </div>

      <div className="story">
        <div>
          <input type="text" placeholder="Story ID" required onChange={(e) => setStoryId(e.target.value)} value={storyId} /> 
          <button disabled={findStoryDisabled} onClick={(e) => { getStory(e) }}>{ findStoryLabel }</button> 
        </div>

        {storyLoading && <div>Loading</div>}
        <br />
        <a className="title" href={story.url} target="_blank">{story.name}</a>
        <div className="description">
          {nl2br(story.description)}
        </div>
      </div>
    </main>
  );
}

export default withRouter(Room);