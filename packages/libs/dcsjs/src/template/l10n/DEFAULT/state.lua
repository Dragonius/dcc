local logName = 'DCS.JS.STATE'
local function debugLog(message) log.write(logName, log.INFO, tostring(message)) end

local missionState = {
    missionId = config.missionId,
    missionEnded = false,
    ejectedPilots = {},
    lostUnits = {},
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

    local groups = {}

    for i in pairs(list) do
        local groupName = list[i]
        if groupName ~= nil then
            local group = Group.getByName(groupName)
            
            if group and group.getCategory then
                local category = group:getCategory()

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

local ev = {}
function ev:onEvent(event)
    debugLog('onEvent: '..event.id)
    -- UNIT LOST
    if event.id == world.event.S_EVENT_UNIT_LOST then
        debugLog('S_EVENT_UNIT_LOST')
        local initiator = event.initiator
        
        if not initiator then return end
        if not initiator:isExist() then return end
        if not initiator.getName then return end
        if not initiator.getPosition then return end

        debugLog("valid S_EVENT_UNIT_LOST")
        debugLog("initiator: "..initiator:getName())

        local name = initiator:getName()
        local position = initiator:getPosition().p

        missionState.lostUnits[#missionState.lostUnits + 1] = {
            name = name,
            x = position.x,
            y = position.z
        }
        
        writeState()
    end
    -- EJECTION
    if event.id == world.event.S_EVENT_LANDING_AFTER_EJECTION then
        debugLog('S_EVENT_LANDING_AFTER_EJECTION')
        local initiator = event.initiator
        
        if not initiator then return end
        if not initiator:isExist() then return end
        if not initiator.getName then return end
        if not initiator.getPosition then return end

        local name = initiator:getName()
        local position = initiator:getPosition().p    
        
        if position.x ~= 0 and position.y ~= 0 then
            local srfType = land.getSurfaceType(position)
            if srfType ~= land.SurfaceType.WATER and srfType ~= land.SurfaceType.SHALLOW_WATER then
                missionState.ejectedPilots[#missionState.ejectedPilots + 1] = {
                    name = name,
                    x = position.x,
                    y = position.z
                }
                writeState()
            end
        end
    end
    -- BIRTH
    if event.id == world.event.S_EVENT_BIRTH and event.initiator and event.initiator.getPlayerName then
        local player = event.initiator:getPlayerName()
        if player then
            debugLog('birth: '..player)
        end
    end

    -- MISSION END
    if event.id == world.event.S_EVENT_MISSION_END then
        missionState.missionEnded = true
        writeState()
    end
end

world.addEventHandler(ev)