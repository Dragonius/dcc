local logName = 'DCS.JS.STATE'
local function debugLog(message) log.write(logName, log.INFO, tostring(message)) end

local missionState = {
    missionId = config.missionId,
    missionEnded = false,
    crashedAircrafts = {},
    destroyedGroundUnits = {},
    groupPositions = {
        blue = {},
        red = {}
    },
}

local function printObj(obj, hierarchyLevel) 
    if (hierarchyLevel == nil) then
        hierarchyLevel = 0
    elseif (hierarchyLevel == 4) then
        return 0
    end
    
    local whitespace = ""
    for i=0,hierarchyLevel,1 do
        whitespace = whitespace .. "-"
    end
    
    debugLog(obj)
    if (type(obj) == "table") then
        for k,v in pairs(obj) do
        io.write(whitespace .. "-")
        if (type(v) == "table") then
            printObj(v, hierarchyLevel+1)
        else
            debugLog(v)
        end           
        end
    else
        debugLog(obj)
    end
end


local function messageAll(message, displayTime)
    local msg = {}
    msg.text = message
    if displayTime then
        msg.displayTime = displayTime
    else
        msg.displayTime = 25
    end
    msg.msgFor = {coa = {'all'}}
    mist.message.add(msg)
end

local function canWrite(name)
    local f = io.open(name, "w")
    if f then
        f:close()
        return true
    end
    return false
end

local function findFilePath()
    if lfs then
        local path = lfs.writedir().."Missions\\"
        local filePath = string.format("%sdcc_state.json", path)

        local isOk = canWrite(filePath)
        if isOk then 
            debugLog(string.format("The dcc_state.json file will be created in %s : (%s)",  path, filePath))
            return filePath
        end
    end

    return nil
end


local filePath = findFilePath()

if filePath then
    debugLog(string.format("State File Location: %s", filePath))
else
    debugLog('Insufficient libraries to run state.lua, you must disable the sanitization of the io and lfs libraries in ./Scripts/MissionScripting.lua')
    messageAll('No Permission to save the Mission State! Mission Progress will not be saved! Please visit our github(https://github.com/Kilcekru/dcc#persistence) or visit our discord to fix the Problem.', 600)
end

local function getGroupPositions(coalition)
    local list = mist.getGroupsByAttribute({coalition = coalition}, 0)

    printObj(list)
    local groups = {}

    for i in pairs(list) do
        local groupName = list[i]
        if groupName ~= nil then
            local group = Group.getByName(groupName)
            
            if group ~= nil then
                local category = Group.getCategory(group)

                if category == Group.Category.AIRPLANE or category == Group.Category.HELICOPTER then
                    --debugLog(groupName .. " is a aircraft")
                    local unit = group:getUnit(1)

                    if unit ~= nil and unit:inAir() then
                        --local position = unit:getPoint()
                        local position = mist.getLeadPos(groupName)
                        if position ~= nil then
                            local groupOut = {}
                            groupOut["name"] = groupName
                            groupOut["x"] = position.x
                            groupOut["y"] = position.y
                            groups[#groups + 1] = groupOut
                        end
                    else
                        unit = group:getUnit(2)

                        if unit ~= nil and unit:inAir() then
                            --local position = unit:getPoint()
                            local position = mist.getLeadPos(groupName)

                            if position ~= nil then
                                local groupOut = {}
                                groupOut["name"] = groupName
                                groupOut["x"] = position.x
                                groupOut["y"] = position.y
                                groups[#groups + 1] = groupOut
                            end
                        else
                            --debugLog(groupName .. " is not in the air")
                        end
                    end
                end
            end
        end
    end

    return groups
end

local function export()
    if io and filePath then
        local fp = io.open(filePath, 'w')
        if fp then
            fp:write(json:encode(missionState))
            fp:close()
        end
    end
end

local function writeState()
    missionState.groupPositions.blue = getGroupPositions("blue")
    missionState.groupPositions.red = getGroupPositions("red")
    missionState.time = timer.getAbsTime()
    export()
end

local function onEvent(event)
    --https://wiki.hoggitworld.com/view/DCS_event_crash
    if event.id == world.event.S_EVENT_CRASH and event.initiator then
        debugLog('S_EVENT_CRASH')
        if event.initiator ~= nil then
            local name = event.initiator.getName(event.initiator)
            local position = event.initiator:getPosition().p

            missionState.crashedAircrafts[#missionState.crashedAircrafts + 1] = {
                name = name,
                x = position.x,
                y = position.z
            }
            
            writeState()
        end
    end

    if event.id == world.event.S_EVENT_KILL and event.initiator then
        debugLog('S_EVENT_KILL')
        if event.initiator ~= nil then
            local name = event.initiator.getName(event.initiator)
            local position = event.initiator:getPosition().p

            missionState.crashedAircrafts[#missionState.crashedAircrafts + 1] = {
                name = name,
                x = position.x,
                y = position.z
            }
            
            writeState()
        end
    end

    if event.id == world.event.S_EVENT_DEAD and event.initiator then
        debugLog('S_EVENT_DEAD')
        missionState.destroyedGroundUnits[#missionState.destroyedGroundUnits + 1] = event.initiator.getName(event.initiator)
        writeState()
    end

    if event.id == world.event.S_EVENT_LAND and event.initiator then
        debugLog('S_EVENT_LAND')
    end

    if event.id == world.event.S_EVENT_EJECTION and event.initiator then
        debugLog('S_EVENT_EJECTION')
    end

    if event.id == world.event.S_EVENT_MISSION_END then
        missionState.missionEnded = true
        writeState()
    end
end

mist.addEventHandler(onEvent)